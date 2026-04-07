# Contributing to GitNexus

How to propose changes, run checks locally, and open pull requests.

## License

This project uses the [PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/). By contributing, you agree your contributions are licensed under the same terms unless stated otherwise.

## Where to discuss

- **Issues & feature ideas:** use [GitHub Issues](https://github.com/abhigyanpatwari/GitNexus/issues) for the upstream repo, or your fork’s tracker if you work from a fork.
- **Community:** see the Discord link in the root [README.md](README.md).

## Development setup

1. Clone the repository.
2. **CLI / MCP package:** `cd gitnexus && npm install && npm run build`
3. **Web UI (if needed):** `cd gitnexus-web && npm install`
4. Run tests as described in [TESTING.md](TESTING.md).

### UOR-Framework submodule (uor-graph fork)

This monorepo pins [UOR-Foundation/UOR-Framework](https://github.com/UOR-Foundation/UOR-Framework) as a git submodule at `third_party/UOR-Framework`. After clone, run `git submodule update --init --recursive` so that path exists. If you change the submodule commit or touch UOR wiring (`.gitmodules`, lock file, `scripts/verify-uor-lock.mjs`, etc.), run `npm run uor:verify-lock` at the repo root before pushing—it must pass in CI.

Full workflow, MCP `repo` naming, and the ontology vs code-graph split are documented in [docs/UOR_INDEX.md](docs/UOR_INDEX.md).

**Compiler gate:** With Rust installed, `npm run uor:verify-cargo` runs `cargo check --workspace` on the UOR submodule (Tier 0 sanity check; also runs in CI).

**Two separate indexes:** Analyzing `third_party/UOR-Framework` registers the **UOR** tree in your GitNexus registry. Running `gitnexus analyze` at the **monorepo root** indexes **GitNexus** itself. Both can coexist locally under different names—pass `repo` to MCP tools when more than one index is present.

## Branch and pull requests

- Use short-lived branches off the default branch of the repo you are targeting.
- Prefer **conventional commits** (short prefix + description), for example:

  ```text
  feat: add graph export option
  fix: correct MCP tool schema for query
  test: cover cluster merge edge case
  docs: clarify analyze flags
  ```

- **PR title:** `[area] Short description` (e.g. `[cli] Fix index refresh race`).
- **PR description:** what changed, why, how to verify (commands), and any risk or rollback notes.

## Before you open a PR

- [ ] Tests pass for the packages you touched (`gitnexus` and/or `gitnexus-web`).
- [ ] Typecheck passes: `npx tsc --noEmit` in `gitnexus/` and `npx tsc -b --noEmit` in `gitnexus-web/`.
- [ ] No secrets, tokens, or machine-specific paths committed.
- [ ] Documentation updated if behavior or public CLI/MCP contract changes.
- [ ] Pre-commit hook runs clean (`.husky/pre-commit` — typecheck + unit tests for staged packages).

## Code review

Maintainers may request changes for correctness, tests, performance, or consistency with existing patterns. Keeping diffs focused makes review faster.

## AI-assisted contributions

If you use coding agents, follow project context files (e.g. `AGENTS.md`, `CLAUDE.md`) and avoid drive-by refactors unrelated to the issue. Prefer incremental, test-backed changes.
