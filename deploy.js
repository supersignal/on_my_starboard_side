#!/usr/bin/env node

// 수동 배포 스크립트
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 MCP 서버 수동 배포 시작...');

try {
  // 1. 빌드
  console.log('📦 TypeScript 빌드 중...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // 2. 테스트 (선택사항)
  console.log('🧪 테스트 실행 중...');
  try {
    execSync('npm run test:ci', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️ 테스트 실패했지만 계속 진행합니다.');
  }
  
  // 3. 패키지 버전 업데이트
  console.log('📝 패키지 버전 업데이트 중...');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const currentVersion = packageJson.version;
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  const newVersion = `${major}.${minor}.${patch + 1}`;
  
  packageJson.version = newVersion;
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  
  console.log(`✅ 버전 업데이트: ${currentVersion} → ${newVersion}`);
  
  // 4. Git 커밋 및 푸시
  console.log('📤 Git 커밋 및 푸시 중...');
  execSync('git add .', { stdio: 'inherit' });
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });
  execSync('git push origin main', { stdio: 'inherit' });
  
  // 5. 태그 생성 및 푸시
  console.log('🏷️ 태그 생성 중...');
  execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
  execSync(`git push origin v${newVersion}`, { stdio: 'inherit' });
  
  console.log('🎉 배포 완료!');
  console.log(`📦 새 버전: ${newVersion}`);
  console.log('🔗 GitHub Actions에서 자동 배포가 시작됩니다.');
  
} catch (error) {
  console.error('❌ 배포 실패:', error.message);
  process.exit(1);
}
