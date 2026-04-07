# GitNexus validation runbook (CLI, MCP, WASM web, bridge)

Operational checklist derived from the migration/validation plan. Use this to confirm GitNexus works end-to-end for this monorepo and the UOR submodule.

**Authoritative backend port:** `http://localhost:4747` — see [`gitnexus/src/cli/serve.ts`](../gitnexus/src/cli/serve.ts) and [`gitnexus-web/src/services/backend-client.ts`](../gitnexus-web/src/services/backend-client.ts). (Some older docs may mention a different port; trust the code.)

---

## Preconditions

| Step | Command / check | Notes |
|------|-----------------|--------|
| Node 20+ | `node -v` | LTS 20.x or 22.x acceptable. |
| Native toolchain (CLI) | python3, make, g++ | Required for Tree-sitter during `npm install` in `gitnexus/`. |
| UOR lock | `npm run uor:verify-lock` (repo root) | Submodule HEAD must match [`config/uor-upstream.lock.json`](../config/uor-upstream.lock.json). |
| Rust + Tier 0 compile gate | `npm run uor:verify-cargo` (repo root) | `cargo check --workspace` on `third_party/UOR-Framework`; requires `cargo`. See [`docs/UOR_INDEX.md`](UOR_INDEX.md). |
| Submodule | `git submodule update --init --recursive` | |
| MCP config | `npx gitnexus setup` or README | [Root README](../README.md) Cursor / Claude blocks. |

---

## Phase 1 — CLI

| Step | Command | Pass |
|------|---------|------|
| 1.1 | `cd gitnexus-shared && npm ci && npm run build` | Shared `dist/` exists. |
| 1.1b | `cd gitnexus && npm ci --ignore-scripts && npm run build && npx tsc --noEmit` | If `npm ci` fails on `prepare`, build shared first, then use `--ignore-scripts` once, then `npm run build`. |
| 1.2 | `npm run uor:prepare && npm run uor:analyze` (repo root) or `node gitnexus/dist/cli/index.js analyze third_party/UOR-Framework` | Analyze completes; `third_party/UOR-Framework/.gitnexus/` exists. |
| 1.3 | `gitnexus list` | UOR repo listed with stable name. |
| 1.4 | `cd third_party/UOR-Framework && gitnexus status` | Index metadata / staleness. |
| 1.5 | Optional: `gitnexus query …` | If available in your CLI version. |

**CI anchor:** [`.github/workflows/uor-index.yml`](../.github/workflows/uor-index.yml) runs verify-lock + build + analyze on **ubuntu-latest** (Linux). If local Windows analyze fails with `ERR_DLOPEN_FAILED` on `@ladybugdb/core`, treat **green `uor-index` workflow** as proof that CLI analyze works in the supported CI environment; fix local Windows by reinstalling native deps, using **WSL2**, or installing the **Microsoft Visual C++ Redistributable** required by native Node addons.

---

## Phase 2 — MCP (stdio)

Perform in Cursor / Claude / other MCP client after Phase 1 index exists.

| Step | Tool | Pass |
|------|------|------|
| 2.1 | Server starts | No startup error (`npx gitnexus mcp` or `node gitnexus/dist/cli/index.js mcp`). |
| 2.2 | `list_repos` | UOR entry present. |
| 2.3 | `query` | UOR-relevant string returns hits (`repo` if multiple indexes). |
| 2.4 | `context` | Known Rust symbol shows incoming/outgoing. |
| 2.5 | `impact` | Upstream blast radius. |
| 2.6 | Optional: `cypher` | After `gitnexus://repo/{name}/schema`. |

---

## Phase 3 — Web UI / WASM (standalone)

| Step | Command | Pass |
|------|---------|------|
| 3.1 | `cd gitnexus-shared && npm ci && npm run build` | (If not already done.) |
| 3.2 | `cd gitnexus-web && npm ci && npx tsc -b --noEmit && npm test` | Typecheck + **207** unit tests (approx.) pass. |
| 3.3 | `npm run dev` | App loads at Vite dev URL (typically port **5173**). |
| 3.4 | Index a **small** ZIP/repo in browser | Within ~5k file guidance ([README](../README.md)). |
| 3.5 | Full UOR in WASM | Optional; may OOM — prefer Phase 4. |

---

## Phase 4 — Bridge (CLI index + web UI)

Requires **working LadybugDB native** (same as analyze).

| Step | Action | Pass |
|------|--------|------|
| 4.1 | UOR analyzed and registered | `gitnexus list` shows UOR. |
| 4.2 | `gitnexus serve` (default port **4747**) | Server listens. |
| 4.3 | `gitnexus-web` `npm run dev`; set backend URL to `http://localhost:4747` | Probe / UI shows connected. |
| 4.4 | Select UOR repo in UI | Data from `/api/repos`, `/api/repo`, etc. |
| 4.5 | Search or graph view | No CORS errors; matches CLI index. |

---

## Phase 5 — E2E (optional)

Per [TESTING.md](../TESTING.md):

1. Terminal A: `gitnexus serve` (from a context where CLI is on PATH or use `node gitnexus/dist/cli/index.js serve`).
2. Terminal B: `cd gitnexus-web && npm run dev`.
3. `cd gitnexus-web && E2E=1 npx playwright test`.

---

## UOR-specific quick path

1. `npm run uor:verify-lock`
2. `npm run uor:verify-cargo` (optional locally; runs in CI)
3. `npm run uor:prepare`
4. `npm run uor:analyze` (or CI)
5. [`docs/UOR_INDEX.md`](UOR_INDEX.md) for MCP `repo` name and two-layer model.

---

## Last local validation run (maintenance log)

| Area | Result (example session) |
|------|---------------------------|
| `uor:verify-lock` | OK |
| `gitnexus-shared` build | OK |
| `gitnexus` `npm run build` + `tsc --noEmit` | OK |
| `gitnexus list` | OK (empty registry until analyze succeeds) |
| `gitnexus analyze` / `serve` | **Failed on Windows** with `ERR_DLOPEN_FAILED` for `lbugjs.node` — environment-specific; use Linux CI/WSL or fix MSVC/native addon install. |
| `gitnexus-web` `tsc -b` + `npm test` | OK (12 files, 207 tests) |
| Recent check (2026-04-07, Windows) | `uor:verify-lock`, `uor:prepare`, `node gitnexus/dist/cli/index.js analyze third_party/UOR-Framework`, `list`, `query -r UOR-Framework` — OK |

Update this table when you re-run validation after environment changes.
