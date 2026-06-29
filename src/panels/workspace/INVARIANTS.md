# Workspace decoupling invariants (spec theorems)

Two architectural invariants govern the workspace. They are not style
preferences — they are **theorems**: properties that must hold for *every*
state of the UI, enforced by fitness-function tests
(`src/panels/__tests__/decoupling-invariants.test.ts`). A change that violates
either one fails CI.

The shared idea: **three orthogonal axes that must never leak into each other.**

| Axis | Owns | Changed by | Must NOT affect |
|------|------|-----------|-----------------|
| Container position | which pane is where | layout / view switch | view internals |
| Reading position | where you are in a doc | scrolling, outline nav | — |
| Selection | which node is focused | clicking a content-address | the document |

---

## Theorem 1 — Container–Content Decoupling (keep-alive)

> Switching layout or active view relocates *containers* only. A view component
> is mounted exactly once and is **never unmounted**; its internal state
> (scroll position, selection, graph zoom/pan) is independent of where its
> container currently sits.

**Mechanism.** Each view (`ReadView`, `NetworkView`, `DetailView`) is rendered
once via `createPortal` into its own **stable DOM container** (an imperatively
created `<div>` that React never recreates). A `useLayoutEffect` relocates those
containers between the active layout's slot targets with `appendChild`, and
parks hidden ones in a `display:none` host. Moving a DOM node does not remount
React, so no view ever reloads.

**Why not conditional rendering / CSS hidden of in-tree views.** Both reshuffle
the React tree as the layout changes, which remounts (or risks remounting) the
views. Portals into stable containers are the only construction where the
component's position in the React tree is *fixed* while its DOM position is
*free*.

**Enforced by:**
- each `<View />` appears exactly once in `WorkspacePanel` JSX
- `createPortal` is used (mounted once)
- `document.createElement` builds the stable containers
- `appendChild` performs relocation (move, not remount)

---

## Theorem 2 — Selection–Document Decoupling

> Selecting a content-address (clicking a card title or an `\entryref` link)
> updates **only the card window** (the Detail view). It never scrolls, reflows,
> or otherwise moves the main document.

**Mechanism.** Clicking a content-address calls `selectObj(hash)`, which sets
`selectedHash` in `selectObjStore`. Only the **card window** (`DetailView`)
subscribes to it. `ReadView` (the document) does **not** read selection at all,
so a selection can have no effect on the reading surface.

**Document scrolling is reserved for explicit navigation:** the outline (TOC)
click, and scroll-position restore on remount. Both are container-scoped
`scrollTo` calls; `scrollIntoView` is banned project-wide because it also
scrolls window/ancestors and would move the top bar.

**Enforced by:**
- `ReadView` does not reference `selectObjStore` (the document is selection-agnostic)
- no `.scrollIntoView(` anywhere in the workspace (container-scoped scroll only)
- `DetailView` *does* read `selectedHash` (the card window is the selection sink)

---

## Theorem 3 — View/UI state has a single source: `viewStore`

All view, layout, and panel-toggle state lives in `src/stores/viewStore.ts` —
`layoutMode`, `activeTab`, `explorerOpen`, `explorerPluginsOpen`,
`explorerFilesOpen`. Components **read** these from the store and never keep their
own copy in local `useState`, so there is exactly one source of truth and no two
mechanisms can disagree (the bug that made "default to network view" need two
edits in two places).

**Enforced by:**
- `viewStore` declares all the UI-state keys above
- `ExplorerPanel` reads its open/closed state from `useViewStore`, with no local `useState(...Open...)`
- the editor page drives the Explorer panel from `explorerOpen` (not the panel library's own collapse state — no `react-resizable-panels` in the page)
