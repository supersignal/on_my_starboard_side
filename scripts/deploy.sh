#!/bin/bash

# MCP 서버 배포 스크립트
# 기존 패키지를 삭제하고 새 버전으로 재배포

set -e

echo "🚀 MCP 서버 배포 시작..."

# 1. 버전 업데이트
echo "📝 버전 업데이트 중..."
npm version patch

# 2. 빌드
echo "🔨 빌드 중..."
npm run build

# 3. 기존 패키지 삭제 (선택사항)
read -p "기존 패키지를 삭제하시겠습니까? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️ 기존 패키지 삭제 중..."
    npm unpublish @supersignal/on_my_starboard_side@$(node -p "require('./package.json').version") --force
fi

# 4. 새 패키지 배포
echo "📦 새 패키지 배포 중..."
npm publish

echo "✅ 배포 완료!"
echo "📋 패키지 정보:"
echo "   - 이름: @supersignal/on_my_starboard_side"
echo "   - 버전: $(node -p "require('./package.json').version")"
echo "   - URL: https://www.npmjs.com/package/@supersignal/on_my_starboard_side"
