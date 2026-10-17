# EYTAA Release & Versioning Guide

This document defines the standard procedure for version bumping, committing, pushing, and tagging releases in **EYTAA**.

---

## 1. Release Architecture & CI/CD Pipeline

When an annotated Git tag matching `v*` (e.g., `v0.2.4`) is pushed to GitHub, the automated GitHub Actions workflow [`.github/workflows/release.yml`](.github/workflows/release.yml) is triggered:
- Compiles the production frontend bundle via `npm run build`.
- Compiles the Rust backend in release mode via Tauri CLI (`cargo tauri build`).
- Bundles native runtime libraries (`libmpv-2.dll`, `libmpv-wrapper.dll`).
- Generates NSIS installers (`.exe`) and MSI bundles.
- Extracts release notes from `CHANGELOG.md` for the corresponding version.
- Creates a GitHub Release and attaches signed binaries and update bundles.

---

## 2. Version Synchronization Checklist

EYTAA maintains synchronized version numbers across **5 core files**. Every new release **MUST** update all 5 files to the same version string (Semantic Versioning `MAJOR.MINOR.PATCH`):

| File | Location / Key | How to Update |
| :--- | :--- | :--- |
| **`package.json`** | `"version": "X.Y.Z"` | Edit directly or run `npm version X.Y.Z --no-git-tag-version` |
| **`package-lock.json`** | `"version": "X.Y.Z"` (root & packages[""]) | Run `npm install --package-lock-only` |
| **`src-tauri/Cargo.toml`** | `[package] version = "X.Y.Z"` | Edit line 3 directly |
| **`src-tauri/Cargo.lock`** | `[[package]] name = "eytaa" version = "X.Y.Z"` | Synced via `cargo check` in `src-tauri` |
| **`src-tauri/tauri.conf.json`** | `"version": "X.Y.Z"` | Edit line 4 directly |
| **`CHANGELOG.md`** | `## [X.Y.Z] - YYYY-MM-DD` | Add top release section with categorized release notes |

---

## 3. Pre-Flight Verification Checks

Before committing, ensure all static analysis and build verifications pass cleanly:

```powershell
# 1. Typecheck the TypeScript codebase
npm run typecheck

# 2. Run ESLint checks
npm run lint

# 3. Verify frontend production bundling
npm run build

# 4. Verify Rust backend compilation
cargo check --manifest-path src-tauri/Cargo.toml
```

> [!NOTE]
> If `cargo check` reports `Blocking waiting for file lock on build directory`, ensure any active local dev server (`npm run tauri:dev`) is paused or not currently holding the build lock.

---

## 4. Standard Step-by-Step Release Workflow

### Step 1: Bump Versions & Update Changelog
1. Update `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json` with the new version (e.g. `0.2.5`).
2. Refresh lockfiles:
   ```powershell
   npm install --package-lock-only
   ```
3. Update `CHANGELOG.md` with:
   ```markdown
   ## [X.Y.Z] - YYYY-MM-DD

   ### ✨ New Features & Performance
   - ...

   ### 🎛️ Controls & UX
   - ...

   ### 🔧 Architecture & Refactoring
   - ...
   ```

### Step 2: Verify Clean Build
```powershell
npm run typecheck
npm run build
```

### Step 3: Stage All Changes
```powershell
git status
git add -A
```

Verify that only intended files are staged (no temporary artifacts, secrets, or debug logs).

### Step 4: Commit
Follow Conventional Commits format:
```powershell
git commit -m "feat: release vX.Y.Z - <short description of major highlights>"
```

*Example:*
```powershell
git commit -m "feat: release v0.2.4 - live library watcher, virtualized media grid, window geometry restore, and modular architecture"
```

### Step 5: Push Branch Commit
Push the commit to the `main` branch:
```powershell
git push origin main
```

### Step 6: Create Annotated Tag
Create an annotated Git tag corresponding to the version (`vX.Y.Z`):
```powershell
git tag -a vX.Y.Z -m "Release vX.Y.Z - <brief summary>"
```

*Example:*
```powershell
git tag -a v0.2.4 -m "Release v0.2.4 - Live library watcher, virtualized media grid, window geometry restore, and modular architecture"
```

### Step 7: Push the Tag
Push the tag to trigger the automated GitHub Actions CI/CD release pipeline:
```powershell
git push origin vX.Y.Z
```

---

## 5. Quick-Reference Command Snippet (PowerShell)

For a release of version `0.2.5`:

```powershell
# Set version variable
$VERSION = "0.2.5"
$TAG = "v$VERSION"

# Run checks
npm run typecheck
npm run build

# Stage & Commit
git add -A
git commit -m "feat: release $TAG - summary of changes"

# Push main
git push origin main

# Tag & Push tag (triggers GitHub Actions release workflow)
git tag -a $TAG -m "Release $TAG"
git push origin $TAG
```

---

## 6. Post-Release Verification

1. Navigate to GitHub Actions tab: `https://github.com/dagijosi/Eytaa/actions`.
2. Confirm the **Release EYTAA** workflow runs and finishes with green checks.
3. Check GitHub Releases: `https://github.com/dagijosi/Eytaa/releases/tag/vX.Y.Z`.
4. Verify installer `.exe` and update artifacts are properly generated and attached.
