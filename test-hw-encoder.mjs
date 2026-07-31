// hw-encoder 单测：pickHwEncoder 优先级与回退逻辑（纯 node）
// 运行：node --experimental-strip-types test-hw-encoder.mjs

let failures = 0
function assert(cond, msg) {
  if (cond) { console.log('  ✓', msg) }
  else { console.error('  ✗', msg); failures++ }
}
function eq(actual, expected, msg) { assert(actual === expected, `${msg} (got ${actual}, expected ${expected})`) }

const { pickHwEncoder, buildEncodeOptions } = await import('./electron/main/hw-encoder.ts')

console.log('hw-encoder pickHwEncoder 单测:')

// 真实 ffmpeg -encoders 输出片段
const REAL = `
 V..... libx264              libx264 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10 (codec h264)
 V..... libx264rgb           libx264 H.264 RGB
 V..... h264_amf             AMD AMF H.264 Encoder
 V..... h264_nvenc           NVIDIA NVENC H.264 encoder
 V..... h264_qsv             H.264 / AVC Intel Quick Sync Video
`

// nvenc 优先级最高
eq(pickHwEncoder(REAL), 'h264_nvenc', 'nvenc/qsv/amf 全有时选 nvenc')

// 只有 qsv 和 amf
eq(pickHwEncoder('  V.... h264_qsv  Intel QSV\n  V.... h264_amf  AMD AMF'), 'h264_qsv', '无 nvenc 时选 qsv')

// 只有 amf
eq(pickHwEncoder('  V.... h264_amf  AMD AMF H.264'), 'h264_amf', '无 nvenc/qsv 时选 amf')

// 全无 → libx264
eq(pickHwEncoder('  V.... libx264  libx264\n  V.... libx265  libx265'), 'libx264', '无硬编器时回退 libx264')

// 空输入
eq(pickHwEncoder(''), 'libx264', '空输入回退 libx264')

// 编码器名作为子串出现不应误判（如 "myh264_nvenc_custom" 会被 \b 边界正确匹配）
// 但 "h264_nvenc2" 不存在，\b 能正确匹配 "h264_nvenc" 这个 token
eq(pickHwEncoder('  V.... h264_nvenc  NVIDIA NVENC'), 'h264_nvenc', 'token 边界匹配正确')

// 顺序无关：amf 在前 nvenc 在后，仍选 nvenc（优先级）
eq(pickHwEncoder('h264_amf\nh264_nvenc\nh264_qsv'), 'h264_nvenc', '顺序无关，按优先级选 nvenc')

// 大小写敏感（编码器名小写）
eq(pickHwEncoder('  H264_NVENC  uppercase'), 'libx264', '大写不匹配，回退 libx264')

console.log('\nhw-encoder buildEncodeOptions 单测:')

const T = 8
// libx264 含 -preset ultrafast + -crf + -threads
const x264 = buildEncodeOptions('libx264', '23', T)
assert(x264.includes('libx264') && x264.includes('ultrafast') && x264.includes('-crf') && x264.includes(String(T)),
  'libx264 选项含 ultrafast/crf/threads')

// nvenc 用 -cq 不用 -crf，无 -threads
const nvenc = buildEncodeOptions('h264_nvenc', '23', T)
assert(nvenc.includes('h264_nvenc') && nvenc.includes('-cq') && !nvenc.includes('-crf') && !nvenc.includes('-threads'),
  'nvenc 用 -cq，无 -crf/-threads')

// qsv 用 -global_quality
const qsv = buildEncodeOptions('h264_qsv', '20', T)
assert(qsv.includes('h264_qsv') && qsv.includes('-global_quality') && !qsv.includes('-crf'),
  'qsv 用 -global_quality，无 -crf')

// amf 用 -qp_i/-qp_p
const amf = buildEncodeOptions('h264_amf', '22', T)
assert(amf.includes('h264_amf') && amf.includes('-qp_i') && amf.includes('-qp_p') && !amf.includes('-crf'),
  'amf 用 -qp_i/-qp_p，无 -crf')

if (failures === 0) { console.log('\n全部通过 ✓'); process.exit(0) }
else { console.error(`\n${failures} 个断言失败`); process.exit(1) }
