import { GITHUB_CONFIG } from '../config/index.js';

export function toRemoteMarkdownLink(link: string) {
  // HTTP나 해시 링크는 무시
  if (link.startsWith("http") || link.startsWith("#")) {
    return;
  }

  // 이미 절대 경로인 경우 그대로 반환
  if (link.startsWith(GITHUB_CONFIG.baseUrl+GITHUB_CONFIG.markdownPath)) {
    return link.endsWith(".markdown") ? link : `${link}.markdown`;
  }

  // 상대 경로인 경우 절대 경로로 변환
  const basePath = GITHUB_CONFIG.baseUrl+GITHUB_CONFIG.markdownPath;
  const fullPath = `${basePath}${link.startsWith("/") ? link : `/${link}`}`;
  return fullPath.endsWith(".markdown") ? fullPath : `${fullPath}.markdown`;
}

