fn main() {
    tauri_build::build();

    // tauri-build 只把 Windows 资源（VERSIONINFO + comctl32 v6 manifest）经
    // rustc-link-arg-bins 链给 bin 目标；cargo test 的测试进程拿不到该 manifest，
    // 于是 comctl32 走 v5（不导出 TaskDialogIndirect）→ STATUS_ENTRYPOINT_NOT_FOUND。
    // 这里用覆盖面更广的 rustc-link-arg 再链一次（bins/cdylib/tests 均生效）。
    if let Ok(out_dir) = std::env::var("OUT_DIR") {
        let lib = std::path::Path::new(&out_dir).join("resource.lib");
        if lib.exists() {
            println!("cargo:rustc-link-arg={}", lib.display());
        }
    }
}
