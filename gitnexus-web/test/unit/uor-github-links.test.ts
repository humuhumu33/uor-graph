import { describe, expect, it } from 'vitest';
import {
  githubBlobUrl,
  githubCommitUrl,
  githubTreeUrl,
  hostedGithubLinksFromMeta,
  normalizeRepoRelativePath,
  parseGitHubRepoWebBase,
} from '../../src/lib/uor-github-links';

describe('uor-github-links', () => {
  it('normalizeRepoRelativePath', () => {
    expect(normalizeRepoRelativePath('spec/src/foo.rs')).toBe('spec/src/foo.rs');
    expect(normalizeRepoRelativePath('.\\spec\\src\\foo.rs')).toBe('spec/src/foo.rs');
    expect(normalizeRepoRelativePath('')).toBeNull();
  });

  it('parseGitHubRepoWebBase accepts https and git@', () => {
    expect(parseGitHubRepoWebBase('https://github.com/UOR-Foundation/UOR-Framework')).toEqual({
      owner: 'UOR-Foundation',
      repo: 'UOR-Framework',
    });
    expect(parseGitHubRepoWebBase('https://github.com/UOR-Foundation/UOR-Framework.git')).toEqual({
      owner: 'UOR-Foundation',
      repo: 'UOR-Framework',
    });
    expect(parseGitHubRepoWebBase('git@github.com:UOR-Foundation/UOR-Framework.git')).toEqual({
      owner: 'UOR-Foundation',
      repo: 'UOR-Framework',
    });
    expect(parseGitHubRepoWebBase('not-a-url')).toBeNull();
  });

  it('githubCommitUrl and githubTreeUrl', () => {
    const r = 'https://github.com/UOR-Foundation/UOR-Framework';
    expect(githubCommitUrl(r, 'abc123deadbeef')).toBe(
      'https://github.com/UOR-Foundation/UOR-Framework/commit/abc123deadbeef',
    );
    expect(githubTreeUrl(r, 'abc123deadbeef')).toBe(
      'https://github.com/UOR-Foundation/UOR-Framework/tree/abc123deadbeef',
    );
  });

  it('hostedGithubLinksFromMeta bundles commit and tree', () => {
    const meta = {
      repository: 'https://github.com/UOR-Foundation/UOR-Framework',
      resolvedSha: 'abc1234',
    };
    expect(hostedGithubLinksFromMeta(meta)).toEqual({
      commitUrl: 'https://github.com/UOR-Foundation/UOR-Framework/commit/abc1234',
      treeUrl: 'https://github.com/UOR-Foundation/UOR-Framework/tree/abc1234',
    });
    expect(hostedGithubLinksFromMeta(null)).toEqual({ commitUrl: null, treeUrl: null });
  });

  it('githubBlobUrl builds blob path and line range', () => {
    const r = 'https://github.com/UOR-Foundation/UOR-Framework';
    expect(
      githubBlobUrl(r, 'sha1', 'spec/src/namespaces/schema.rs', { startLine: 10, endLine: 12 }),
    ).toBe(
      'https://github.com/UOR-Foundation/UOR-Framework/blob/sha1/spec/src/namespaces/schema.rs#L10-L12',
    );
    expect(githubBlobUrl(r, 'sha1', 'spec/src/namespaces/schema.rs', { startLine: 5 })).toBe(
      'https://github.com/UOR-Foundation/UOR-Framework/blob/sha1/spec/src/namespaces/schema.rs#L5',
    );
    expect(githubBlobUrl(r, 'sha1', 'spec/src/namespaces/schema.rs', null)).toBe(
      'https://github.com/UOR-Foundation/UOR-Framework/blob/sha1/spec/src/namespaces/schema.rs',
    );
  });
});
