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

### Indexing scope (hosted graph / public site alignment)

[`config/uor.gitnexusignore`](../config/uor.gitnexusignore) is a **blocklist**: GitNexus still walks `third_party/UOR-Framework`, but **skips** workspace trees that are not the ontology + published artifacts + static site story (e.g. `clients/`, `codegen/`, `conformance/`, `foundation/`, `uor-foundation-macros/`, `docs/`). **`website/` is indexed** (static site sources), alongside **`spec/`** (ontology) and **`public/`** (JSON-LD, Turtle, SHACL, etc.).

That keeps the GitHub Pages graph closer to [uor-foundation.github.io/UOR-Framework](https://uor-foundation.github.io/UOR-Framework/) than to the full Rust workspace. Root files (e.g. top-level `Cargo.toml`) may still be indexed unless added to the ignore file.

The export script [`scripts/export-hosted-uor-graph.mjs`](../scripts/export-hosted-uor-graph.mjs) applies a second **path-prefix filter** (`spec/`, `public/`, `website/`) so the shipped `uor-hosted/*.json` cannot drift if ignore rules change. The manifest may include `hostedScope` (e.g. `spec,public,website`) for debugging.

**Developing GitNexus in this repo:** After `cd gitnexus && npm install && npm run build`, use `npm run uor:analyze:local` at the repo root to run the **in-tree** CLI (`node gitnexus/dist/cli/index.js …`)—same binary CI uses in `.github/workflows/uor-index.yml`. That avoids `npx` fetching a different npm version than your workspace.

**After changing the ignore file:** run `npm run uor:prepare` and **re-analyze** so `.gitnexus` is rebuilt; old index data will not reflect the new scope until you do.

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

## Web UI on GitHub Pages

This repository publishes the static `gitnexus-web` app to GitHub Pages at:

- `https://humuhumu33.github.io/uor-graph/`

The workflow [`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml) checks out the UOR submodule, verifies `config/uor-upstream.lock.json`, runs `gitnexus analyze` on `third_party/UOR-Framework`, exports `gitnexus-web/public/uor-hosted/manifest.json` plus chunk JSON via [`scripts/export-hosted-uor-graph.mjs`](../scripts/export-hosted-uor-graph.mjs), then builds and deploys `gitnexus-web/dist`.

### Hosted UOR graph (default on Pages)

On the live site, the app loads a **pre-built** `{ nodes, relationships }` snapshot from `uor-hosted/manifest.json` and `uor-hosted/chunks/*.json` (same shapes as a successful `connectToServer` graph). You get read-only exploration: pan/zoom, selection, file tree, in-memory process flows, and header search over node names. **No** `gitnexus serve`, upload, or CLI is required for visitors.

The manifest includes `resolved_sha` (from the lock file) so the UI can show which UOR commit the graph represents. It may also include `ontologyInventory` (from `spec/src/counts.rs`) and the UI loads `ontology-terms.json` (IRIs extracted at export) to drive the **Ontology Inventory** bar and perspective filters (namespaces / classes / properties / individuals), aligned with the [public UOR site](https://uor-foundation.github.io/UOR-Framework/).

- Add `?hosted=0` to the URL to skip the static snapshot and use the normal onboarding / `?server=` bridge flow (for debugging).

### What still requires backend mode

- Live Cypher, repo listing, re-analyze, server embeddings, and AI chat tools that call HTTP APIs.
- Workflows that exceed what fits in a single static export (very large graphs may need chunking or follow-up lazy loading).

**Local preview of hosted assets:** from the repo root after `cd gitnexus && npm run build`, run `npm run uor:prepare`, `npm run uor:analyze:local`, then `npm run uor:export-hosted`; `cd gitnexus-web && npm run build && npm run preview` and open the preview URL (with the same `base` as production, graph loads from `public/uor-hosted/`).

### Refresh policy

The published graph updates when `main` runs the Pages workflow—typically after changes under the workflow’s `paths` filters (including `third_party/**`, `config/uor-upstream.lock.json`, `gitnexus/**`, `gitnexus-web/**`, and export scripts). Bumping the UOR submodule or lock without rebuilding Pages would not change the live site until a deploy runs.

For full local-backend capabilities, run `gitnexus serve` and open the UI with `?server=` or the bridge flow.

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

**Hosted web graph (Sigma):** UOR perspective filters apply in **substrate order** — classify which **edges** belong to the ontology frame (both endpoints match the active perspective), then apply UOR + depth/label rules on **nodes**, then hide **edges** if the substrate failed or either endpoint is hidden. The export script filters **relationships** by path scope first (via endpoint lookup), then the same node filter as before.

## Knowledge graph ↔ website ↔ GitHub (hosted UI)

The static bundle includes `manifest.json` (`repository`, `resolvedSha`) and optional `ontology-terms.json`. From a **selected node**, the Code Inspector offers:

| Destination | Mechanism |
|-------------|-----------|
| [UOR Foundation site](https://uor-foundation.github.io/UOR-Framework/) (namespace tables) | [`gitnexus-web/src/lib/uor-foundation-links.ts`](../gitnexus-web/src/lib/uor-foundation-links.ts) — `/namespaces/{prefix}/` with `#class-`, `#prop-`, `#ind-` fragments, aligned with upstream `uor-website` |
| Generated reference HTML | Same module — `/docs/namespaces/{prefix}.html#{local}` per `uor_docs` / `docs/src/linker.rs` |
| GitHub file at the pin | [`gitnexus-web/src/lib/uor-github-links.ts`](../gitnexus-web/src/lib/uor-github-links.ts) — `https://github.com/…/blob/{sha}/{path}` with optional `#L` line range |
| This app | `?focus=<graphNodeId>` in the URL selects the node, opens the code panel, and focuses the camera (query param is then stripped) |

The **Ontology Inventory** bar links the foundation homepage, the **commit** for `resolvedSha`, and the **repo tree** at that pin; in **Namespaces** perspective, **Open on site** jumps to the namespace index or a specific module page.

## CI

`.github/workflows/uor-index.yml` runs `verify-uor-lock`, **`uor:verify-cargo` (Rust `cargo check`)**, `uor:prepare`, and `gitnexus analyze` when submodule, lock, or UOR scripts change.

## Optional automation

`.github/dependabot.yml` can open weekly submodule bump PRs; after merging, run `npm run uor:sync-lock` and re-commit the lock if Dependabot does not run it for you.
