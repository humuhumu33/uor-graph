/**
 * Pin-accurate links into the upstream UOR-Framework Git repository (hosted graph manifest).
 */

/** Normalize repo-relative paths from graph nodes (forward slashes, no leading ./). */
export function normalizeRepoRelativePath(filePath: string | undefined): string | null {
  if (!filePath || !String(filePath).trim()) return null;
  let p = String(filePath).replace(/\\/g, '/').replace(/^\.\//, '');
  p = p.replace(/^\/+/, '');
  return p || null;
}

export type GitHubRepoParts = { owner: string; repo: string };

/**
 * Parse `https://github.com/org/repo` or `org/repo` into owner/repo for github.com web URLs.
 */
export function parseGitHubRepoWebBase(
  repository: string | undefined | null,
): GitHubRepoParts | null {
  if (!repository?.trim()) return null;
  const s = repository.trim();
  // git@github.com:org/repo.git
  const ssh = s.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (ssh) {
    return { owner: ssh[1], repo: ssh[2] };
  }
  try {
    const u = s.startsWith('http') ? new URL(s) : new URL(`https://${s}`);
    if (!u.hostname.toLowerCase().includes('github.com')) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    let repo = parts[1];
    if (repo.endsWith('.git')) repo = repo.slice(0, -4);
    return { owner, repo };
  } catch {
    return null;
  }
}

export function githubCommitUrl(repository: string | undefined | null, sha: string): string | null {
  const parts = parseGitHubRepoWebBase(repository);
  if (!parts || !sha?.trim()) return null;
  return `https://github.com/${parts.owner}/${parts.repo}/commit/${sha.trim()}`;
}

export function githubTreeUrl(repository: string | undefined | null, sha: string): string | null {
  const parts = parseGitHubRepoWebBase(repository);
  if (!parts || !sha?.trim()) return null;
  return `https://github.com/${parts.owner}/${parts.repo}/tree/${sha.trim()}`;
}

/**
 * Blob URL at pinned commit. Optional 1-based line range for GitHub UI (`#L10-L20`).
 */
/** Commit + tree URLs for the hosted manifest pin (deduplicates Header / StatusBar / HUD). */
export function hostedGithubLinksFromMeta(
  meta: { repository?: string; resolvedSha: string } | null | undefined,
): { commitUrl: string | null; treeUrl: string | null } {
  if (!meta?.resolvedSha?.trim()) {
    return { commitUrl: null, treeUrl: null };
  }
  const sha = meta.resolvedSha.trim();
  return {
    commitUrl: githubCommitUrl(meta.repository, sha),
    treeUrl: githubTreeUrl(meta.repository, sha),
  };
}

export function githubBlobUrl(
  repository: string | undefined | null,
  sha: string,
  filePath: string | undefined,
  lineRange?: { startLine: number; endLine?: number } | null,
): string | null {
  const parts = parseGitHubRepoWebBase(repository);
  const rel = normalizeRepoRelativePath(filePath);
  if (!parts || !sha?.trim() || !rel) return null;

  const enc = rel
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  let url = `https://github.com/${parts.owner}/${parts.repo}/blob/${sha.trim()}/${enc}`;

  if (lineRange && typeof lineRange.startLine === 'number' && lineRange.startLine > 0) {
    const start = lineRange.startLine;
    const end =
      typeof lineRange.endLine === 'number' && lineRange.endLine > 0 ? lineRange.endLine : start;
    if (start === end) {
      url += `#L${start}`;
    } else {
      const a = Math.min(start, end);
      const b = Math.max(start, end);
      url += `#L${a}-L${b}`;
    }
  }

  return url;
}
