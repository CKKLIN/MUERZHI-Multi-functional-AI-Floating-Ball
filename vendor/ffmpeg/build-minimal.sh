#!/bin/bash
# build-minimal.sh —— 构建"仅含本应用实际用到的能力"的静态 ffmpeg.exe（MSYS2/MinGW64 环境）
# 用法：在 C:\msys64\usr\bin\bash -lc 环境里执行本脚本。
# 能力清单来源：electron/main/ffmpeg.ts + hw-encoder.ts 的全部实际调用（无 ffprobe/网络/dshow）。
#
# 前置依赖（pacman -S --noconfirm 安装）：
#   make diffutils mingw-w64-x86_64-{toolchain,nasm,x264,ffnvcodec-headers,libvpl,zlib,pkgconf}
set -euo pipefail

VENDOR_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="$VENDOR_DIR/src"
BUILD_DIR="$VENDOR_DIR/build"
FF_VERSION="7.1.1"

mkdir -p "$SRC_DIR" "$BUILD_DIR"
cd "$SRC_DIR"

# ── 下载源码：ffmpeg.org → GitHub（走 ghproxy 加速）→ gitee 镜像，国内网络逐个回退 ──
TARBALL="ffmpeg-$FF_VERSION.tar.xz"
if [ ! -d "ffmpeg-$FF_VERSION" ]; then
  if [ ! -f "$TARBALL" ]; then
    echo "[1/4] downloading ffmpeg $FF_VERSION source..."
    curl -fL --connect-timeout 15 -o "$TARBALL" \
      "https://ffmpeg.org/releases/$TARBALL" \
    || curl -fL --connect-timeout 15 -o "$TARBALL" \
      "https://ghproxy.net/https://github.com/FFmpeg/FFmpeg/releases/download/n$FF_VERSION/$TARBALL" \
    || { git clone --depth 1 --branch "n$FF_VERSION" https://gitee.com/mirrors/ffmpeg "ffmpeg-$FF_VERSION"; }
  fi
  if [ -f "$TARBALL" ]; then
    tar -xf "$TARBALL"
  fi
fi
cd "ffmpeg-$FF_VERSION"

# AMF SDK 头文件（h264_amf 编码器需要，configure 校验 AMF/core/Version.h >= 1.4.21）。
# GitHub 档案 tarball 在国内直连极慢/续传失效，改为 jsdelivr CDN 逐文件拉取头文件树；
# jsdelivr 也不可达时跳过 AMF（h264_amf 编码器缺席，硬编回退 nvenc/qsv → libx264）。
AMF_VER="1.4.36"
AMF_INC="$SRC_DIR/amf-headers-$AMF_VER"
if [ ! -f "$AMF_INC/AMF/core/Version.h" ]; then
  echo "downloading AMF SDK headers v$AMF_VER via jsdelivr..."
  mkdir -p "$AMF_INC"
  okamf=0
  if curl -fsSL --connect-timeout 15 --max-time 60 -o /tmp/amf_tree.json \
       "https://data.jsdelivr.com/v1/packages/gh/GPUOpen-LibrariesAndSDKs/AMF@v$AMF_VER?structure=flat"; then
    node -e '
      const t = JSON.parse(require("fs").readFileSync("/tmp/amf_tree.json", "utf8"));
      const files = (t.files || [])
        .map(f => f.name)
        .filter(n => n.startsWith("/amf/public/include/") && (n.endsWith(".h") || n.endsWith(".inc")));
      console.log(files.join("\n"));
    ' > /tmp/amf_files.txt
    n=$(grep -c . /tmp/amf_files.txt || true)
    echo "AMF header files to fetch: $n"
    if [ "${n:-0}" -gt 0 ]; then
      okamf=1
      while IFS= read -r rel; do
        [ -n "$rel" ] || continue
        dest="$AMF_INC/${rel#/amf/public/include/}"
        mkdir -p "$(dirname "$dest")"
        curl -fsSL --connect-timeout 15 --max-time 60 -o "$dest" \
          "https://cdn.jsdelivr.net/gh/GPUOpen-LibrariesAndSDKs/AMF@v$AMF_VER/$rel" || { okamf=0; break; }
      done < /tmp/amf_files.txt
    fi
  fi
  if [ "$okamf" = "1" ] && [ -f "$AMF_INC/AMF/core/Version.h" ]; then
    echo "AMF headers ready: $AMF_INC"
  else
    echo "WARNING: AMF headers unavailable, building WITHOUT h264_amf"
    rm -rf "$AMF_INC"
  fi
fi
AMF_ENABLE=()
AMF_CFLAGS=()
if [ -f "$AMF_INC/AMF/core/Version.h" ]; then
  AMF_ENABLE=(--enable-amf)
  AMF_CFLAGS=(--extra-cflags="-I$AMF_INC")
fi

# MinGW 的 PE 链接器不认 ELF 专用的 -Wl,-z,*（noexecstack 等），configure 塞进 LDFLAGS 后
# 会连累所有外部库静态链接测试（表现为"xxx not found"实际是 ld 报 unrecognized option '-z'）
sed -i 's/-Wl,-z,noexecstack//; s/-Wl,-z,relro//; s/-Wl,-z,now//' configure
# 上游 Makefile 缺口：H264_SEI 链入 h2645_sei.o，而它无条件调用 aom_film_grain.o 的符号——
# 后者只挂在 HEVC_SEI 对象行（常规全量构建永远开启故不触发；极简构建 H264_SEI 开、HEVC_SEI 关
# 时链接失败 undefined reference to ff_aom_uninit_film_grain_params）。把对象补进 H264_SEI 行。
sed -i 's/^\(OBJS-\$(CONFIG_H264_SEI).*h2645_sei\.o\)$/\1 aom_film_grain.o/' libavcodec/Makefile
make distclean >/dev/null 2>&1 || true

# ── configure：disable-everything 后按清单精确开启 ──
# 能力对照（与 ffmpeg.ts 一一对应）：
#   remux webm→mp4 (-c copy)        : demuxer matroska + muxer mov
#   转码音频 aac (-c:a aac)          : encoder aac + decoder opus/vorbis
#   裁剪/多屏合并 (hw encode 回退)    : encoders h264_nvenc/qsv/amf + libx264，filters crop/pad/format
#   多屏 overlay 合成               : filters scale/setsar/overlay/color
#   GIF 两遍 (palettegen/paletteuse): filters fps/palettegen/paletteuse + scale lanczos，
#                                     palette 走 PNG（demuxer/encoder/decoder png + demuxer/muxer image2）
#   hw 探测 (-encoders)             : CLI 内建
echo "[2/4] configuring (minimal feature set)..."
./configure \
  --arch=x86_64 \
  --target-os=mingw32 \
  --prefix="$VENDOR_DIR/install" \
  --disable-everything \
  --disable-network \
  --disable-avdevice \
  --disable-postproc \
  --disable-doc \
  --disable-debug \
  --disable-ffplay \
  --disable-ffprobe \
  --disable-iconv \
  --disable-bzlib \
  --disable-lzma \
  --enable-gpl \
  --enable-libx264 \
  --enable-libvpl \
  --enable-ffnvcodec \
  --enable-swscale \
  --enable-swresample \
  --enable-zlib \
  --enable-encoder=libx264,aac,h264_nvenc,h264_qsv,h264_amf,png \
  --enable-decoder=vp8,vp9,h264,aac,opus,vorbis,png \
  --enable-demuxer=matroska,mov,gif,image2 \
  --enable-muxer=mov,mp4,matroska,gif,image2 \
  --enable-filter=crop,pad,format,scale,setsar,overlay,fps,palettegen,paletteuse,color,hwupload,null,anull \
  --enable-protocol=file \
  --enable-small \
  --pkg-config-flags=--static \
  --extra-ldflags="-static" \
  --extra-libs="-lpthread -lm -lstdc++" \
  "${AMF_ENABLE[@]}" \
  "${AMF_CFLAGS[@]}"

echo "[3/4] building..."
# 整体 make（ffplay/ffprobe 已禁用，产物只有 ffmpeg.exe）；单指定 ffmpeg 目标在新版 Makefile 下会报"没有规则"
make -j"$(nproc)"

echo "[4/4] strip + install..."
strip -o "$VENDOR_DIR/ffmpeg.exe" ffmpeg
ls -la "$VENDOR_DIR/ffmpeg.exe"
echo "DONE: $VENDOR_DIR/ffmpeg.exe"
