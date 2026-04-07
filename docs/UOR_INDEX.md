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

**Developing GitNexus in this repo:** After `cd gitnexus && npm install && npm run build`, use `npm run uor:analyze:local` at the repo root to run the **in-tree** CLI (`node gitnexus/dist/cli/index.js …`)—same binary CI uses in `.github/workflows/uor-index.yml`. That avoids `npx` fetching a different npm version than your workspace.

Index output: `third_party/UOR-Framework/.gitnexus/` (local; gitignored). Embeddings: GitNexus defaults to **off** for `analyze`; use `npx gitnexus analyze third_party/UOR-Framework --embeddings` or add `--embeddings` to the `uor:analyze:local` command line if you want vectors. If you once used embeddings, avoid later runs without `--embeddings` if you need to keep them (see root `AGENTS.md`).

## Compiler gate (Tier 0)

GitNexus produces a **structural** code graph; the Rust toolchain is the independent check that the **pinned UOR workspace compiles**.

```bash
npm run uor:verify-cargo
```

Runs `cargo check --workspace` in `third_party/UOR-Framework`. Requires [Rust](https://rustup.rs/) (`cargo` on `PATH`). This does **not** feed results into GitNexus—it is an **out-of-band** sanity gate before trusting MCP/graph answers for high-stakes work.

Optional (slower, compiles tests without running them): `UOR_VERIFY_CARGO_TEST=1 npm run uor:verify-cargo`.

CI runs the same check in [`.github/workflows/uor-index.yml`](../.github/workflows/uor-index.yml) after `uor:verify-lock`.

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

`.github/workflows/uor-index.yml` runs `verify-uor-lock`, **`uor:verify-cargo` (Rust `cargo check`)**, `uor:prepare`, and `gitnexus analyze` when submodule, lock, or UOR scripts change.

## Optional automation

`.github/dependabot.yml` can open weekly submodule bump PRs; after merging, run `npm run uor:sync-lock` and re-commit the lock if Dependabot does not run it for you.
