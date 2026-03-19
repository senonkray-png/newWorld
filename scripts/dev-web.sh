#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname "$0")" && pwd -P)
repo_root=$(CDPATH= cd -- "$script_dir/.." && pwd -P)
alias_root="${TMPDIR:-/tmp}/novyi-mir-dev"

mkdir -p "$alias_root"
rsync -a --delete --exclude '.git' --exclude 'apps/web/.next' --exclude '.next' "$repo_root/" "$alias_root/"
cd "$alias_root/apps/web"

exec npx next dev --hostname 0.0.0.0 "$@"
