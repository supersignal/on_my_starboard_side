# 📝 커밋 메시지 가이드

## 🚨 한글 인코딩 문제 해결

Windows 환경에서 Git 한글 인코딩 문제를 방지하기 위한 가이드입니다.

### 1. **Git 설정 (이미 적용됨)**
```bash
git config --global core.quotepath false
git config --global i18n.commitencoding utf-8
git config --global i18n.logoutputencoding utf-8
```

### 2. **권장 커밋 메시지 형식**

#### ✅ 좋은 예시 (영어)
```bash
git commit -m "feat: add deployment automation scripts"
git commit -m "fix: resolve npm publish cache issue"
git commit -m "docs: update deployment guide"
```

#### ❌ 피해야 할 예시 (한글)
```bash
git commit -m "feat: 배포 자동화 스크립트 추가"
git commit -m "fix: npm 배포 캐시 문제 해결"
```

### 3. **npm 스크립트 사용법**

#### 기능 추가
```bash
npm run commit:feat --message="add deployment automation scripts"
```

#### 버그 수정
```bash
npm run commit:fix --message="resolve npm publish cache issue"
```

#### 문서 업데이트
```bash
npm run commit:docs --message="update deployment guide"
```

### 4. **커밋 메시지 컨벤션**

#### 타입별 접두사
- `feat:` 새로운 기능
- `fix:` 버그 수정
- `docs:` 문서 변경
- `style:` 코드 포맷팅
- `refactor:` 코드 리팩토링
- `test:` 테스트 추가/수정
- `chore:` 빌드 프로세스 또는 보조 도구 변경

#### 예시
```bash
feat: add circular buffer for metrics optimization
fix: resolve API key logging security issue
docs: update deployment strategy guide
refactor: improve error handling in auth middleware
test: add unit tests for security utils
chore: update dependencies to latest versions
```

### 5. **문제 발생 시 해결 방법**

#### 한글이 깨진 커밋 메시지 수정
```bash
# 마지막 커밋 메시지 수정
git commit --amend -m "feat: add deployment automation scripts"

# 강제 푸시 (주의: 협업 시 팀원과 상의 필요)
git push --force-with-lease
```

#### 인코딩 확인
```bash
# 현재 Git 설정 확인
git config --list | findstr encoding

# 로그 인코딩 확인
git log --oneline -5
```

### 6. **IDE 설정 (선택사항)**

#### VS Code
```json
{
  "git.inputValidation": "off",
  "git.inputValidationLength": 72,
  "git.inputValidationSubjectLength": 50
}
```

#### Cursor
```json
{
  "git.commitMessageTemplate": "feat: ",
  "git.inputValidation": "off"
}
```

## 📋 체크리스트

- [ ] Git 인코딩 설정 확인
- [ ] 영어 커밋 메시지 사용
- [ ] 적절한 타입 접두사 사용
- [ ] 간결하고 명확한 메시지 작성
- [ ] 푸시 전 메시지 확인

## 🔗 참고 자료

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git 한글 인코딩 문제 해결](https://git-scm.com/book/ko/v2/Git%EB%A7%9E%EC%B6%A4-Git-%EC%84%A4%EC%A0%95)
