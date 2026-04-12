<p align="center">
  <a href="https://github.com/MathNetwork/Astrolabe">
    <img src="src-tauri/icons/128x128@2x.png" alt="Astrolabe" width="80" />
  </a>
</p>

<h1 align="center">Astrolabe</h1>

<p align="center">
  A desktop application for reading, visualizing, and interacting with <code>astrolabe.json</code> knowledge networks.
</p>

<p align="center">
  <img alt="Paper" src="https://img.shields.io/badge/paper-arXiv%20(forthcoming)-red" />
  <a href="https://github.com/MathNetwork/Astrolabe/blob/main/LICENSE"><img alt="License: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue" /></a>
  <a href="https://github.com/MathNetwork/Astrolabe/releases/latest"><img alt="Release" src="https://img.shields.io/badge/release-v0.2.1-brightgreen" /></a>
</p>

<p align="center">
  <a href="https://github.com/MathNetwork/Astrolabe/releases/latest/download/Astrolabe_0.2.1_aarch64.dmg"><img alt="macOS Apple Silicon" src="https://img.shields.io/badge/macOS-Apple%20Silicon-000?logo=apple&logoColor=white" /></a>
  <a href="https://github.com/MathNetwork/Astrolabe/releases/latest/download/Astrolabe_0.2.1_x64.dmg"><img alt="macOS Intel" src="https://img.shields.io/badge/macOS-Intel-000?logo=apple&logoColor=white" /></a>
  <a href="https://github.com/MathNetwork/Astrolabe/releases/latest/download/Astrolabe_0.2.1_x64-setup.exe"><img alt="Windows" src="https://img.shields.io/badge/Windows-x64-0078D4?logo=windows&logoColor=white" /></a>
  <a href="https://github.com/MathNetwork/Astrolabe/releases/latest/download/Astrolabe_0.2.1_amd64.deb"><img alt="Linux" src="https://img.shields.io/badge/Linux-deb-FCC624?logo=linux&logoColor=black" /></a>
</p>

---

## What is Astrolabe?

Astrolabe is a reader and visualizer for `astrolabe.json` — a content-addressable data format for knowledge networks. Each entry is identified by the SHA-256 hash of its record string, carries an ordered reference list pointing to other entries, and stores an opaque record for semantic annotation. The reference list induces a width (number of references minus one) and, together with acyclicity constraints, a depth decomposition. These two dimensions — width and depth — organize the network into layers of increasing semantic complexity.

Astrolabe provides an interactive environment to read, browse, and analyze these structures:

- **ReadView** — render `.astrolabe/docs/*.mdx` with LaTeX, entry blocks, and cross-references
- **NetworkView** — visualize the entry graph with d3-force simulation
- **DetailView** — inspect entries with structured record rendering
- **Plugin system** — extensible analysis and visualization

## astrolabe.json

```json
{
  "<12-char-hash>": {
    "ref": ["<hash>", ...],
    "record": "<string>"
  }
}
```

- **ref** — an ordered list of hashes, any length. `|ref| - 1` defines the width of the entry.
  - width 0: `ref = [self_hash]` — an atom (base unit)
  - width 1: `ref = [A, B]` — a binary relation
  - width k: `ref = [h₀, h₁, ..., hₖ]` — a higher-dimensional semantic relation
- **record** — a plain string. The core layer does not interpret it. Plugins define conventions for structured content (JSON with `sort`, `source`, `title`, `notes`, etc.)
- **hash** — `SHA256(record)[:12 hex]`, content-addressable. The reference list does not participate in hash computation.

The format is general-purpose. Any domain — mathematics, software, biology, legal — can use it by defining its own record conventions.

Astrolabe documents can use `\entryref{hash}` and `\entryblock{hash}` macros in `.mdx` files and record `notes` fields to create cross-references and inline entry displays. Standard `$...$` LaTeX math is rendered via KaTeX.

## Plugins

Plugins extend Astrolabe with custom analysis, visualization, and UI. They can transform network data, add sections to the detail panel, and define record conventions.

### LeanNets

The built-in plugin for network analysis. It extracts width-0 (atoms) and width-1 (edges) entries as a directed graph, and supports multiple network analysis metrics and visualization modes. See [`src/plugins/leannets/README.md`](src/plugins/leannets/README.md) for the full specification.

## Build

```bash
npm install
cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"

# Run (backend + Tauri desktop app)
npm run dev:all

# Tests
npm test                                    # frontend (vitest)
cd backend && python3 -m pytest             # backend (pytest)
```

## License

[AGPL-3.0](LICENSE)
