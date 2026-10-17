# Agent Guidelines for EYTAA

## Release & Versioning Workflow

When asked to bump the version, commit, push, or tag a new release, follow these instructions strictly:

1. **Synchronize All 5 Version Files**:
   - `package.json` (`version`)
   - `package-lock.json` (`npm install --package-lock-only`)
   - `src-tauri/Cargo.toml` (`[package] version`)
   - `src-tauri/Cargo.lock` (`[[package]] name = "eytaa" version`)
   - `src-tauri/tauri.conf.json` (`version`)

2. **Changelog Entry**:
   - Always update `CHANGELOG.md` with a new `## [X.Y.Z] - YYYY-MM-DD` section detailing all new features, UX improvements, bug fixes, and architectural refactoring.

3. **Pre-flight Checks**:
   - Run `npm run typecheck` (`tsc --noEmit`) and ensure 0 TypeScript errors.
   - Run `npm run lint` and verify no fatal lint errors.
   - Run `npm run build` to confirm Vite production bundling succeeds.
   - Run `cargo check --manifest-path src-tauri/Cargo.toml` when target lock allows.

4. **Git Sequence**:
   - `git add -A`
   - `git commit -m "feat: release vX.Y.Z - <headline summary>"`
   - `git push origin main`
   - `git tag -a vX.Y.Z -m "Release vX.Y.Z - <summary>"`
   - `git push origin vX.Y.Z` (Triggers `.github/workflows/release.yml`)

For complete details, refer to [RELEASE_PROCESS.md](RELEASE_PROCESS.md).
