#!/usr/bin/env bash
# استقرار روی سرور (staging یا production). پیش‌نیاز: Node، pnpm، PM2، PostgreSQL.
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
pnpm install --frozen-lockfile
pnpm db:generate
pnpm build
pnpm db:deploy
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
