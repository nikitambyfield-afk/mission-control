#!/bin/zsh
set -euo pipefail

export OLYMPIA_TELEMETRY_ENDPOINT="https://olympia-telemetry.olympia-mission-control.workers.dev/v1/telemetry"
export OLYMPIA_TELEMETRY_SECRET="$(security find-generic-password -s olympia.telemetry -a collector -w)"

exec /opt/homebrew/bin/node /Users/nikita/projects/mission-control/scripts/telemetry-push.mjs
