// 单元测试入口（显式 test target）
//
// 为什么需要它：
//   1) cargo test --lib 在 Windows 下因缺 comctl32 v6 manifest 报 STATUS_ENTRYPOINT_NOT_FOUND，
//      只有显式 test target 才能吃到 build.rs 的 rustc-link-arg-tests；
//   2) 用 include! 把 lib.rs 平铺到测试 crate 根（不是嵌套 mod），
//      lib.rs 内部的 crate::modules::... 路径才依然正确解析。
#![allow(clippy::all)]
#![allow(non_snake_case)]

include!("../src/lib.rs");
