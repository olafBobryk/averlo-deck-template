#!/bin/sh
set -eu

# Official github/spec-kit v1.4.1, pinned to the release's source commit.
repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_dir"
exec uvx --from git+https://github.com/github/spec-kit.git@4b570b6e9758a12d8b10c0def8da6f1bf5f750f1 specify "$@"
