export function parseLLMText(text) {
    return text
        .split("\n")
        .filter((line) => {
        const link = extractLink(line);
        return isGithubMarkdownUrl(link);
    })
        .map((line) => {
        const link = extractLink(line);
        return parse({ text: line, link: toRawGithubUrl(link) });
    });
}
function extractLink(line) {
    const start = line.indexOf("](");
    const end = line.indexOf(")", start);
    return line.substring(start + 2, end);
}
function parse(link) {
    const { text, link: url } = link;
    const title = extractTitle(text);
    const description = extractDescription(text);
    return {
        text,
        title,
        link: url,
        description,
    };
}
function extractTitle(text) {
    const start = text.indexOf("[") + 1;
    const end = text.indexOf("](", start);
    return text.substring(start, end).trim();
}
function extractDescription(text) {
    const start = text.indexOf("):") + 2;
    return text.substring(start).trim();
}
function isGithubMarkdownUrl(url) {
    if (!url)
        return false;
    const patterns = [
        /^https?:\/\/github\.com\/supersignal\/going_on_hypersonic\/blob\/[^/]+\/(?:src\/)?markdown\//i,
        /^https?:\/\/raw\.githubusercontent\.com\/supersignal\/going_on_hypersonic\/[^/]+\/(?:src\/)?markdown\//i,
    ];
    return patterns.some((re) => re.test(url));
}
function toRawGithubUrl(url) {
    if (!url)
        return url;
    // already raw
    if (/^https?:\/\/raw\.githubusercontent\.com\//i.test(url))
        return url;
    // blob -> raw
    const m = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.*)$/i);
    if (m) {
        const [, owner, repo, branch, rest] = m;
        return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${rest}`;
    }
    return url;
}
