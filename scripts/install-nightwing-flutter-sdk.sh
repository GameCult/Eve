#!/usr/bin/env bash
set -euo pipefail

state_dir="$HOME/.local/state/gamecult"
sdk_dir="$HOME/.local/share/gamecult/flutter"
log_path="$state_dir/eve-linux-flutter-install.log"
status_path="$state_dir/eve-linux-flutter-install.status"

export CI=true
export FLUTTER_SUPPRESS_ANALYTICS=true
export NO_COLOR=1

mkdir -p "$state_dir" "$(dirname "$sdk_dir")"

{
  date -u '+started %Y-%m-%dT%H:%M:%SZ'
  if [ ! -x "$sdk_dir/bin/flutter" ]; then
    rm -rf "$sdk_dir.tmp"
    git clone --depth 1 -b stable https://github.com/flutter/flutter.git "$sdk_dir.tmp"
    rm -rf "$sdk_dir"
    mv "$sdk_dir.tmp" "$sdk_dir"
  else
    git -C "$sdk_dir" fetch --depth 1 origin stable
    git -C "$sdk_dir" checkout stable
    git -C "$sdk_dir" pull --ff-only origin stable
  fi

  "$sdk_dir/bin/flutter" --disable-analytics
  "$sdk_dir/bin/flutter" --version
  "$sdk_dir/bin/flutter" precache --linux
  date -u '+completed %Y-%m-%dT%H:%M:%SZ'
  echo complete > "$status_path"
} >> "$log_path" 2>&1
