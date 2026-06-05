use std::{fs, path::Path};

fn main() {
    // Keep the desktop frontend in sync with the canonical single-file app.
    // Cargo runs build.rs with CWD = this crate dir (desktop/src-tauri), so the
    // paths below are deterministic regardless of where the build was invoked.
    //
    //   ../../index.html  = repo-root index.html  (the source of truth + fallback)
    //   ../dist           = desktop/dist          (what Tauri bundles)
    //
    // The root file is only ever READ here, never written, so a broken desktop
    // build can never corrupt the standalone HTML app.
    let dist = Path::new("../dist");
    let _ = fs::create_dir_all(dist);
    if let Err(e) = fs::copy("../../index.html", dist.join("index.html")) {
        // Don't hard-fail the build if the copy can't happen (e.g. the seeded
        // copy already exists); just warn so the bundled app may be stale.
        println!("cargo:warning=could not sync index.html into dist: {e}");
    }
    // Re-run this script (and re-copy) whenever the root app changes.
    println!("cargo:rerun-if-changed=../../index.html");

    tauri_build::build();
}
