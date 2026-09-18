// 媒体子系统：ffmpeg 转码族 + 硬件编码器探测 + 在途转换注册表 + 本地视频协议
#![allow(dead_code)]

pub mod conversion_registry;
pub mod ffmpeg;
pub mod hw_encoder;
pub mod local_video;

#[allow(unused_imports)]
pub use ffmpeg::MergeInput;
