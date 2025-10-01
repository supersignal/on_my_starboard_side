@echo off
REM MCP 서버 배포 스크립트 (Windows)
REM 기존 패키지를 삭제하고 새 버전으로 재배포

echo 🚀 MCP 서버 배포 시작...

REM 1. 버전 업데이트
echo 📝 버전 업데이트 중...
npm version patch

REM 2. 빌드
echo 🔨 빌드 중...
npm run build

REM 3. 기존 패키지 삭제 여부 확인
set /p delete_old="기존 패키지를 삭제하시겠습니까? (y/N): "
if /i "%delete_old%"=="y" (
    echo 🗑️ 기존 패키지 삭제 중...
    for /f %%i in ('node -p "require('./package.json').version"') do set current_version=%%i
    npm unpublish @supersignal/on_my_starboard_side@%current_version% --force
)

REM 4. 새 패키지 배포
echo 📦 새 패키지 배포 중...
npm publish

echo ✅ 배포 완료!
echo 📋 패키지 정보:
echo    - 이름: @supersignal/on_my_starboard_side
for /f %%i in ('node -p "require('./package.json').version"') do echo    - 버전: %%i
echo    - URL: https://www.npmjs.com/package/@supersignal/on_my_starboard_side
