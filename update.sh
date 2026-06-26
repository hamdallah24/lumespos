#!/bin/bash
set -e
# ── Daily update + sync Staging ──
# Run on VPS: bash ~/lumespos/update.sh

cd ~/lumespos

echo "📥 Fetching..."
git fetch

echo "🔄 Syncing Staging ← main..."
git checkout Staging
git merge main --no-edit
git push origin Staging

echo "📥 Pulling main..."
git checkout main
git pull

echo "🔨 Building API..."
pnpm --filter ./artifacts/api-server run build

echo "🔨 Building frontend..."
pnpm --filter ./artifacts/pos-app run build

echo "🚀 Restarting PM2..."
pm2 restart pos-api

echo ""
echo "✅ Done. Staging synced, main pulled, built, restarted."
