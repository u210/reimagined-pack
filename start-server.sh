#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
exec /usr/bin/java @user_jvm_args.txt @libraries/net/neoforged/neoforge/21.1.244/unix_args.txt nogui
