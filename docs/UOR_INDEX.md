# UOR-Framework × GitNexus (this repo)

Canonical **upstream ontology + code** for indexing is [UOR-Foundation/UOR-Framework](https://github.com/UOR-Foundation/UOR-Framework). This **uor-graph** repo does not modify that project. We pin it as a **git submodule** at `third_party/UOR-Framework`; the submodule commit is the single source of truth for “which UOR tree.” `config/uor-upstream.lock.json` is **generated** from that checkout (`npm run uor:sync-lock`) — do not hand-edit `resolved_sha`.

Only that GitHub repository is supported as the UOR corpus; CI verifies the submodule remote and lock file.

## Clone & update

Replace `UOR-Foundation/uor-graph` below with this repository’s path on GitHub if it differs.

```bash
git clone --recurse-submodules https://github.com/UOR-Foundation/uor-graph.git
cd uor-graph
# or, if already cloned:
git submodule update --init --recursive
```

To move the pin: `cd third_party/UOR-Framework && git fetch && git checkout <tag-or-SHA> && cd ../..` then `npm run uor:sync-lock` and commit submodule + lock.

## Prepare & analyze

```bash
npm run uor:prepare    # copies config/uor.gitnexusignore → submodule (upstream stays untouched)
npm run uor:analyze    # npx gitnexus analyze third_party/UOR-Framework
```

Index output: `third_party/UOR-Framework/.gitnexus/` (local; gitignored). Embeddings: GitNexus defaults to **off** for `analyze`; use `npx gitnexus analyze third_party/UOR-Framework --embeddings` if you want vectors. If you once used embeddings, avoid later runs without `--embeddings` if you need to keep them (see root `AGENTS.md`).

## MCP

After analyze, run `gitnexus list` and use the **repo** name shown for that path in MCP tools (`query`, `context`, `impact`, …).

## Two-layer model (UOR + graph)

- **Meaning (ontology):** IRIs, `public/*` exports, and `spec/` live **inside** the submodule at the pinned commit. Cite that tree + SHA for vocabulary / SHACL / JSON-LD answers.
- **Code navigation:** GitNexus graph over the same tree — callers, imports, processes. Use MCP tools for structure, not as a second ontology.

Together, ontology + code graph usually place answers in the right layer if you keep the split explicit.

## Collaborator guidance (edges before nodes)

Use this **order** for docs, onboarding, and agent exploration (we do not fork GitNexus core here; this is how humans/tools should *read* the system):

1. **Ontology edges** — relationship vocabulary: predicates, class hierarchies, shapes under `public/*` (and spec) at the pinned commit.
2. **Workspace / crate edges** — `cargo metadata`, `mod` / `use` graph; then GitNexus **IMPORTS** / **CONTAINS**-style structure.
3. **GitNexus relation types** — see `gitnexus-shared` / graph schema (`CALLS`, `IMPLEMENTS`, …) as the code-edge vocabulary.
4. **Entrypoint symbols** — binaries, `uor-build`, conformance drivers, etc.

For MCP: prefer `query` / `impact` / process resources for **relationship context** before dumping raw symbol lists; ground answers with **submodule SHA + file path**.

## CI

`.github/workflows/uor-index.yml` runs `verify-uor-lock`, `uor:prepare`, and `gitnexus analyze` when submodule, lock, or UOR scripts change.

## Optional automation

`.github/dependabot.yml` can open weekly submodule bump PRs; after merging, run `npm run uor:sync-lock` and re-commit the lock if Dependabot does not run it for you.
