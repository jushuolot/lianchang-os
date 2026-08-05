#!/usr/bin/env bash
# 部署链场 OS → https://os.v2way.com
# - 静态文件：/opt/jinshouzhi/lianchang-os
# - TLS/站点：nuanban-caddy-staging（与 www / chain / kudi 同机）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE="$(cd "$ROOT/.." && pwd)"

SSH_HOST="${ALIYUN_SSH:-${NUANBAN_SSH:-root@101.200.128.82}}"
SSH=(ssh -o BatchMode=yes -o IdentitiesOnly=yes -i "${ALIYUN_SSH_KEY:-$HOME/.ssh/id_ed25519}" "$SSH_HOST")
SCP=(scp -o BatchMode=yes -o IdentitiesOnly=yes -i "${ALIYUN_SSH_KEY:-$HOME/.ssh/id_ed25519}")
RSYNC_SSH="ssh -o BatchMode=yes -o IdentitiesOnly=yes -i ${ALIYUN_SSH_KEY:-$HOME/.ssh/id_ed25519}"

REMOTE_DIR="${LIANCHANG_REMOTE_DIR:-/opt/jinshouzhi/lianchang-os}"
NUANBAN_DIR="${NUANBAN_REMOTE_DIR:-/opt/jinshouzhi/nuanban_github}"
DOMAIN="${LIANCHANG_DOMAIN:-os.v2way.com}"

echo "==> 0/4 预检"
test -f "$WORKSPACE/nuanban_github/Caddyfile.staging"
grep -q 'os.v2way.com' "$WORKSPACE/nuanban_github/Caddyfile.staging"
grep -q 'lianchang-os' "$WORKSPACE/nuanban_github/docker-compose.staging.yml"

echo "==> 1/4 构建（根路径 base=/）"
cd "$ROOT"
npm ci
VITE_BASE=/ npm run build
test -f dist/index.html

echo "==> 2/4 rsync 静态站 → ${SSH_HOST}:${REMOTE_DIR}"
"${SSH[@]}" "mkdir -p '${REMOTE_DIR}'"
rsync -az --delete -e "$RSYNC_SSH" \
  --exclude .git \
  --exclude .DS_Store \
  "$ROOT/dist/" "${SSH_HOST}:${REMOTE_DIR}/"

echo "==> 3/4 同步 Caddy / compose 并 reload"
"${SSH[@]}" "cp -a '${NUANBAN_DIR}/Caddyfile.staging' '${NUANBAN_DIR}/Caddyfile.staging.bak.\$(date +%Y%m%d%H%M%S)' 2>/dev/null || true"
"${SCP[@]}" "$WORKSPACE/nuanban_github/Caddyfile.staging" \
  "${SSH_HOST}:${NUANBAN_DIR}/Caddyfile.staging"
"${SCP[@]}" "$WORKSPACE/nuanban_github/docker-compose.staging.yml" \
  "${SSH_HOST}:${NUANBAN_DIR}/docker-compose.staging.yml"

"${SSH[@]}" "set -e
  cd '${NUANBAN_DIR}'
  docker compose -f docker-compose.yml -f docker-compose.staging.yml --profile staging up -d caddy
  sleep 2
  docker exec nuanban-caddy-staging caddy validate --config /etc/caddy/Caddyfile
  docker exec nuanban-caddy-staging caddy reload --config /etc/caddy/Caddyfile || \
    docker compose -f docker-compose.yml -f docker-compose.staging.yml --profile staging restart caddy
"

echo "==> 4/4 冒烟"
"${SSH[@]}" "set -e
  echo 'os local Host:'
  curl -sI --http1.1 --connect-timeout 8 -H 'Host: ${DOMAIN}' http://127.0.0.1/ | head -10
  echo 'www:'
  curl -sI --http1.1 --connect-timeout 8 -H 'Host: www.v2way.com' http://127.0.0.1/ | head -5
"
sleep 2
curl -sI --connect-timeout 15 "https://${DOMAIN}/" 2>&1 | head -15 || true

echo
echo "完成：https://${DOMAIN}/"
echo "DNS 应为 A → 101.200.128.82；证书由 Caddy 自动申请。"
