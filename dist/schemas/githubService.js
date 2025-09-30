import { Octokit } from "@octokit/rest";
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
});
export class GithubService {
    async listIssues(owner, repo) {
        const issues = await octokit.issues.listForRepo({ owner, repo });
        return issues.data.map(i => ({
            number: i.number,
            title: i.title,
            state: i.state,
            url: i.html_url,
        }));
    }
    async createIssue(owner, repo, title, body) {
        const issue = await octokit.issues.create({ owner, repo, title, body });
        return { number: issue.data.number, url: issue.data.html_url };
    }
    async listPulls(owner, repo) {
        const pulls = await octokit.pulls.list({ owner, repo });
        return pulls.data.map(p => ({
            number: p.number,
            title: p.title,
            state: p.state,
            url: p.html_url,
        }));
    }
    async getRepoDocs(owner, repo, path = "README.md") {
        const content = await octokit.repos.getContent({ owner, repo, path });
        if ("content" in content.data) {
            return Buffer.from(content.data.content, "base64").toString("utf-8");
        }
        return null;
    }
}
