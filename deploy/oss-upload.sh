#!/usr/bin/env bash
# 上传 dist 到阿里云 OSS，供 CDN / 自定义域 os.v2way.com 使用
# 依赖：已安装 ossutil，并配置好 AccessKey
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

: "${OSS_BUCKET:=lianchang-os}"
: "${OSS_ENDPOINT:=oss-cn-hangzhou.aliyuncs.com}"
: "${OSS_PREFIX:=}"

export VITE_BASE=/
npm ci
npm run build

DEST="oss://${OSS_BUCKET}/${OSS_PREFIX}"
echo "Upload → ${DEST} (endpoint ${OSS_ENDPOINT})"
ossutil cp -r -f dist/ "${DEST}" -e "${OSS_ENDPOINT}"
echo "Done. Bind CDN domain os.v2way.com → OSS/CDN，并开启 HTTPS。"
