#!/bin/bash

# NicePay MCP 서버 시작 스크립트
echo "🚀 NicePay developers MCP 서버를 시작합니다..."
echo "📁 작업 디렉토리: $(pwd)"

# 빌드 확인
if [ ! -f "dist/server.js" ]; then
    echo "⚙️  서버를 빌드합니다..."
    npm run build
fi

# 서버 실행
echo "🌟 MCP 서버 실행 중..."
echo "💡 Cursor에서 연결 대기 중..."
node dist/server.js 