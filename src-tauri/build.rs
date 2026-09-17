fn main() {
    tauri_build::build();

    // tauri-build 把 Windows 资源（VERSIONINFO + comctl32 v6 manifest）经 rustc-link-arg-bins
    // 只链给 bin 目标；cargo test 的 harness 缺该 manifest → comctl32 走 v5（不导出
    // TaskDialogIndirect）→ 进程以 STATUS_ENTRYPOINT_NOT_FOUND 退出。
    // 这里用 rustc-link-arg-tests 单独补给测试目标（不能再用 rustc-link-arg，否则
    // 与 tauri-build 的 bins 链接重复 → CVTRES CVT1100 资源重复）。
    if let Ok(out_dir) = std::env::var("OUT_DIR") {
        let lib = std::path::Path::new(&out_dir).join("resource.lib");
        if lib.exists() {
            println!("cargo:rustc-link-arg-tests={}", lib.display());
        }
    }
}
