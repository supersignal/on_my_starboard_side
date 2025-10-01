# 🚀 MCP 서버 배포 가이드

## 📋 배포 전략

온라인 MCP 서버의 경우 패키지 업데이트가 즉시 반영되지 않는 문제가 있습니다. 이는 MCP 클라이언트가 패키지를 캐시하기 때문입니다.

### 🔄 권장 배포 방식

#### 1. **일반 배포** (새 버전)
```bash
npm run deploy
```

#### 2. **강제 배포** (현재 버전 삭제 후 재배포)
```bash
npm run deploy:force
```

#### 3. **완전 초기화 배포** (모든 버전 삭제 후 재배포)
```bash
npm run deploy:clean
```

## 📝 배포 단계별 가이드

### 1. **코드 변경 후**
```bash
# 1. 변경사항 커밋
git add .
git commit -m "feat: 새로운 기능 추가"

# 2. 버전 업데이트
npm version patch  # 또는 minor, major

# 3. 배포
npm run deploy:force  # 강제 배포 권장
```

### 2. **수동 배포**
```bash
# 1. 빌드
npm run build

# 2. 기존 패키지 삭제 (선택사항)
npm unpublish @supersignal/on_my_starboard_side@0.0.23 --force

# 3. 새 패키지 배포
npm publish
```

## ⚠️ 주의사항

### npm unpublish 제한사항
- **24시간 내**: 패키지 삭제 후 즉시 재배포 가능
- **24시간 후**: 패키지 삭제 후 24시간 대기 필요
- **대안**: 새 버전으로 배포 후 사용자에게 업데이트 안내

### 권장사항
1. **테스트 환경**에서 충분히 테스트 후 배포
2. **버전 관리**를 명확히 하여 롤백 가능
3. **사용자 안내**를 위한 릴리즈 노트 작성

## 🔧 배포 스크립트 사용법

### Windows
```cmd
scripts\deploy.bat
```

### Linux/Mac
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## 📊 배포 상태 확인

### npm 패키지 확인
```bash
npm view @supersignal/on_my_starboard_side versions --json
```

### 웹에서 확인
- https://www.npmjs.com/package/@supersignal/on_my_starboard_side

## 🚨 문제 해결

### 배포 실패 시
1. **OTP 코드 확인**: 2FA 인증기에서 새 코드 받기
2. **네트워크 확인**: 인터넷 연결 상태 확인
3. **권한 확인**: `npm whoami`로 로그인 상태 확인

### 패키지 삭제 실패 시
1. **24시간 대기**: npm 정책에 따른 대기 시간
2. **새 버전 배포**: 대신 새 버전으로 배포
3. **npm 지원팀 문의**: 심각한 문제 시 npm 지원팀에 문의

## 📈 모니터링

### 배포 후 확인사항
- [ ] 패키지가 npm에 정상 등록되었는지 확인
- [ ] MCP 클라이언트에서 새 버전 인식하는지 확인
- [ ] 기능이 정상 작동하는지 테스트
- [ ] 사용자에게 업데이트 안내

### 로그 모니터링
```bash
# MCP 서버 로그 확인
npm run start-hybrid
```

## 🔄 자동화 옵션

### GitHub Actions (선택사항)
```yaml
name: Deploy to npm
on:
  push:
    tags:
      - 'v*'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```
