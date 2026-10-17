# Third-Party Notices

EYTAA Player (`com.dagi.eytaa`) is built on and redistributes third-party
software. This file lists the major components, their licenses, and where to
obtain their source. It is provided for attribution and license-compliance
purposes and is not a substitute for the full license texts.

> **Note:** The exact set of transitive dependencies is pinned in
> `package-lock.json` (JavaScript) and `src-tauri/Cargo.lock` (Rust). The list
> below covers the directly-used and redistributed components.

---

## Bundled native binaries (redistributed with the app)

These files are shipped in `src-tauri/lib/` and are loaded at runtime by the
player. They are **not** authored by this project.

### libmpv / mpv

- **Files:** `libmpv-2.dll`, `libmpv-wrapper.dll`
- **Project:** mpv <https://mpv.io> / libmpv
- **License:** GNU General Public License v2.0 or later (GPL-2.0-or-later).
  Some libmpv builds are LGPL-2.1-or-later when built without GPL-only
  components; the widely redistributed Windows builds are GPL-2.0-or-later.
- **Source:** <https://github.com/mpv-player/mpv>
- **License text:** <https://www.gnu.org/licenses/old-licenses/gpl-2.0.html>

### FFmpeg

- **Bundled within:** `libmpv-2.dll` (mpv statically links FFmpeg in typical builds)
- **Project:** FFmpeg <https://ffmpeg.org>
- **License:** LGPL-2.1-or-later, or GPL-2.0-or-later when built with
  GPL-enabled components (e.g. `--enable-gpl`).
- **Source:** <https://ffmpeg.org/download.html>
- **License texts:**
  - LGPL-2.1: <https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html>
  - GPL-2.0: <https://www.gnu.org/licenses/old-licenses/gpl-2.0.html>

> **GPL/LGPL obligation:** Because this application distributes GPL/LGPL
> libraries, recipients are entitled to the corresponding source code. The
> upstream sources are linked above; the small `libmpv-wrapper.dll` shim is
> built from the `tauri-plugin-libmpv` project (see Rust dependencies).

---

## JavaScript / npm dependencies

All are used under their respective licenses. Full texts are available in
`node_modules/<package>/LICENSE`.

| Package | License | Homepage |
| --- | --- | --- |
| `react`, `react-dom` | MIT | <https://react.dev> |
| `framer-motion` | MIT | <https://www.framer.com/motion/> |
| `zustand` | MIT | <https://github.com/pmndrs/zustand> |
| `lucide-react` | ISC | <https://lucide.dev> |
| `tailwindcss`, `@tailwindcss/vite` | MIT | <https://tailwindcss.com> |
| `@tauri-apps/api` | Apache-2.0 OR MIT | <https://tauri.app> |
| `@tauri-apps/plugin-dialog` | Apache-2.0 OR MIT | <https://tauri.app> |
| `@tauri-apps/plugin-fs` | Apache-2.0 OR MIT | <https://tauri.app> |
| `@tauri-apps/plugin-global-shortcut` | Apache-2.0 OR MIT | <https://tauri.app> |
| `@tauri-apps/plugin-opener` | Apache-2.0 OR MIT | <https://tauri.app> |
| `@tauri-apps/plugin-process` | Apache-2.0 OR MIT | <https://tauri.app> |
| `@tauri-apps/plugin-updater` | Apache-2.0 OR MIT | <https://tauri.app> |
| `tauri-plugin-libmpv-api` | MIT | <https://github.com/Anon-136/tauri-plugin-libmpv> |
| `vite` | MIT | <https://vitejs.dev> |
| `typescript` | Apache-2.0 | <https://www.typescriptlang.org> |

---

## Rust / Cargo dependencies

All are used under their respective licenses. Full texts are available in
`src-tauri/target/.../registry` or via `cargo license`.

| Crate | License | Homepage |
| --- | --- | --- |
| `tauri` | Apache-2.0 OR MIT | <https://tauri.app> |
| `tauri-plugin-opener` | Apache-2.0 OR MIT | <https://tauri.app> |
| `tauri-plugin-dialog` | Apache-2.0 OR MIT | <https://tauri.app> |
| `tauri-plugin-fs` | Apache-2.0 OR MIT | <https://tauri.app> |
| `tauri-plugin-libmpv` | MIT | <https://github.com/Anon-136/tauri-plugin-libmpv> |
| `tauri-plugin-global-shortcut` | Apache-2.0 OR MIT | <https://tauri.app> |
| `tauri-plugin-updater` | Apache-2.0 OR MIT | <https://tauri.app> |
| `tauri-plugin-process` | Apache-2.0 OR MIT | <https://tauri.app> |
| `tauri-plugin-single-instance` | Apache-2.0 OR MIT | <https://tauri.app> |
| `serde`, `serde_json` | Apache-2.0 OR MIT | <https://serde.rs> |
| `rusqlite` | MIT | <https://github.com/rusqlite/rusqlite> |
| `base64` | Apache-2.0 OR MIT | <https://github.com/marshallpierce/rust-base64> |
| `windows-sys` | Apache-2.0 OR MIT | <https://github.com/microsoft/windows-rs> |

---

## Fonts & assets

- UI uses the operating system system-UI font stack; no third-party fonts are
  redistributed.
- Icons are provided by `lucide-react` (ISC).
