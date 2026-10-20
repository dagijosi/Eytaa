#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$REPO_ROOT/src-tauri/lib"
STAGING_DIR="$REPO_ROOT/src-tauri/macos-lib"
STAGING_BIN_DIR="$REPO_ROOT/src-tauri/macos-bin"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "prepare-macos-libs: skipping, this script must run on macOS."
  exit 0
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "prepare-macos-libs: Homebrew is required. Install it from https://brew.sh." >&2
  exit 1
fi

if ! command -v dylibbundler >/dev/null 2>&1; then
  brew install dylibbundler
fi

if ! brew --prefix mpv >/dev/null 2>&1; then
  brew install mpv
fi

if ! brew --prefix ffmpeg >/dev/null 2>&1; then
  brew install ffmpeg
fi

if [[ ! -f "$SOURCE_DIR/libmpv-wrapper.dylib" ]]; then
  echo "prepare-macos-libs: libmpv-wrapper.dylib is missing, downloading it..."
  (cd "$REPO_ROOT" && npm run setup:lib)
fi

if [[ ! -f "$SOURCE_DIR/libmpv-wrapper.dylib" ]]; then
  echo "prepare-macos-libs: libmpv-wrapper.dylib was not found in $SOURCE_DIR." >&2
  exit 1
fi

MPV_LIB="$(brew --prefix mpv)/lib/libmpv.dylib"
FFMPEG_BIN="$(brew --prefix ffmpeg)/bin/ffmpeg"
if [[ ! -e "$MPV_LIB" ]]; then
  echo "prepare-macos-libs: libmpv.dylib was not found at $MPV_LIB." >&2
  exit 1
fi
if [[ ! -x "$FFMPEG_BIN" ]]; then
  echo "prepare-macos-libs: ffmpeg was not found at $FFMPEG_BIN." >&2
  exit 1
fi

rm -rf "$STAGING_DIR" "$STAGING_BIN_DIR"
mkdir -p "$STAGING_DIR" "$STAGING_BIN_DIR"

cp -L "$SOURCE_DIR/libmpv-wrapper.dylib" "$STAGING_DIR/libmpv-wrapper.dylib"
cp -L "$MPV_LIB" "$STAGING_DIR/libmpv.dylib"
cp -L "$FFMPEG_BIN" "$STAGING_BIN_DIR/ffmpeg"

dylibbundler \
  -b \
  -of \
  -x "$STAGING_DIR/libmpv.dylib" \
  -x "$STAGING_DIR/libmpv-wrapper.dylib" \
  -x "$STAGING_BIN_DIR/ffmpeg" \
  -d "$STAGING_DIR" \
  -p "@executable_path/lib"

while IFS= read -r -d '' binary; do
  if ! otool -l "$binary" | grep -A3 "LC_RPATH" | grep -q "@executable_path/lib"; then
    install_name_tool -add_rpath "@executable_path/lib" "$binary" 2>/dev/null || true
  fi
done < <(find "$STAGING_DIR" "$STAGING_BIN_DIR" -type f \( -name "*.dylib" -o -name "ffmpeg" \) -print0)

find "$STAGING_DIR" "$STAGING_BIN_DIR" -type f \( -name "*.dylib" -o -name "ffmpeg" \) -exec codesign --force --sign - {} \;

for binary in "$STAGING_DIR"/*.dylib "$STAGING_BIN_DIR/ffmpeg"; do
  # otool prints a filename header, and dylibs also print their own install name
  # (LC_ID_DYLIB) first. The ID may legitimately point at Homebrew; only the
  # actual dependency entries matter for runtime.
  start_line=2
  if [[ "$binary" == *.dylib ]]; then
    start_line=3
  fi

  if otool -L "$binary" | tail -n +"$start_line" | grep -E "/opt/homebrew|/usr/local/(Cellar|opt)"; then
    echo "prepare-macos-libs: $binary still references Homebrew paths." >&2
    exit 1
  fi
done

while IFS= read -r dependency; do
  dependency="${dependency#@rpath/}"
  dependency="${dependency#@executable_path/lib/}"
  if [[ ! -f "$STAGING_DIR/$dependency" ]]; then
    echo "prepare-macos-libs: missing bundled dependency $dependency." >&2
    exit 1
  fi
done < <(otool -L "$STAGING_DIR"/*.dylib "$STAGING_BIN_DIR/ffmpeg" | awk '/@rpath\// || /@executable_path\/lib\// { print $1 }' | sort -u)

echo "prepare-macos-libs: bundled $(find "$STAGING_DIR" -type f -name "*.dylib" | wc -l | tr -d ' ') dylibs and ffmpeg into $STAGING_DIR / $STAGING_BIN_DIR."
