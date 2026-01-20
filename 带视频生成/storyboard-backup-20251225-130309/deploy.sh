#!/bin/bash

# Vercel 直接部署脚本
# 需要设置环境变量: VERCEL_TOKEN 和 VERCEL_PROJECT_ID

if [ -z "$VERCEL_TOKEN" ]; then
  echo "错误: 请设置 VERCEL_TOKEN 环境变量"
  exit 1
fi

if [ -z "$VERCEL_PROJECT_ID" ]; then
  echo "错误: 请设置 VERCEL_PROJECT_ID 环境变量"
  exit 1
fi

# 构建项目
npm run build

# 部署到 Vercel
curl -X POST https://api.vercel.com/v13/deployments \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d @- << EOF
{
  "name": "storyboard-master",
  "files": $(find dist -type f -exec echo '{}' \; | jq -R -s -c 'split("\n")[:-1] | map({file: ., data: (. | @base64)})'),
  "projectId": "$VERCEL_PROJECT_ID",
  "production": true
}
EOF

echo "部署完成！"
