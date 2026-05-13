# VS Code Check

[![CI](https://github.com/sm18lr88/VS_Code_Check/actions/workflows/ci.yml/badge.svg)](https://github.com/sm18lr88/VS_Code_Check/actions/workflows/ci.yml)

- VS Code extension that refreshes Problems diagnostics by loading all lintable workspace files on demand.
- Simpler terms: mimics manually opening and loading all files in order to detect what's still obviously wrong in your codebase.

<img width="315" alt="image" src="https://github.com/user-attachments/assets/8b9ed07f-24cd-4d43-af56-6eee80ea7c82" />


## Features

- **VS Code Check** - Click the status bar button to re-check all lintable workspace files
- **Check Folder** - Right-click any folder in the Explorer to check only its lintable files

### Supported File Types

| Category | Extensions |
|----------|------------|
| JavaScript/TypeScript | `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.mts`, `.cts` |
| Python | `.py`, `.pyi` |
| Web | `.html`, `.css`, `.scss`, `.sass`, `.less`, `.vue`, `.svelte`, `.astro` |
| Config | `.json`, `.jsonc`, `.yaml`, `.yml`, `.toml`, `.xml`, `.hcl` |
| Markup | `.md`, `.mdx`, `.tex` |
| Data/Query | `.sql`, `.graphql`, `.gql` |
| System Languages | `.rs`, `.c`, `.cpp`, `.cc`, `.cxx`, `.h`, `.hpp`, `.hxx`, `.go`, `.zig`, `.nim`, `.d`, `.v` |
| JVM Languages | `.java`, `.kt`, `.kts`, `.scala`, `.groovy`, `.gradle` |
| .NET Languages | `.cs`, `.fs`, `.fsx`, `.fsi`, `.vb`, `.vba`, `.vbs` |
| Functional Languages | `.clj`, `.cljs`, `.cljc`, `.edn`, `.hs`, `.lhs`, `.ml`, `.mli`, `.ex`, `.exs`, `.erl`, `.hrl`, `.lisp`, `.lsp`, `.cl`, `.scm`, `.rkt` |
| Scripting | `.rb`, `.php`, `.pl`, `.pm`, `.lua`, `.r`, `.R`, `.sh`, `.bash`, `.zsh`, `.ps1`, `.bat`, `.cmd`, `.vim` |
| Mobile/Native | `.swift`, `.m`, `.mm`, `.dart`, `.as`, `.mxml` |
| Infrastructure | `.tf`, `.tfvars`, `.dockerfile`, `Dockerfile`, `.pp` |
| Build Systems | `.make`, `.cmake`, `.bazel`, `Makefile`, `CMakeLists.txt` |
| Protocols/IDL | `.proto`, `.thrift`, `.avsc` |
| Shaders | `.glsl`, `.hlsl`, `.wgsl`, `.frag`, `.vert`, `.shader` |
| Blockchain | `.sol`, `.move`, `.cairo` |
| Scientific | `.jl`, `.sas`, `.do`, `.ado`, `.f`, `.f90`, `.f95` |
| Other | `.pas`, `.asm`, `.s`, `.cr` |

### Smart Exclusions

The extension automatically excludes:

- **Directories**: `node_modules`, `.git`, `venv`, `.venv`, `dist`, `build`, `__pycache__`, `.next`, `coverage`, and many more
- **Files**: Lock files (`package-lock.json`, `yarn.lock`, etc.), minified files (`*.min.js`), compiled files, logs, and environment files
- **Large files**: Files over 1MB are skipped
- **Generated/dependency folders**: Skips common build outputs, caches, virtual environments, and dependency folders

## Usage

### Status Bar Button

Click **Code Check** in the VS Code status bar to re-check all lintable files in the current workspace.

### Folder Context Menu

Right-click any folder in the Explorer and select **"VS Code Check: Check Folder"** to check only lintable files from that specific folder and its subfolders.

### Command Palette

You can also use the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for "VS Code Check: Check Workspace".

## Configuration

- `vsCodeCheck.openConcurrency` (default: `32`) — How many files to load in parallel. Set to `0` to load all files at once (may freeze VS Code in very large workspaces).

## Why?

Many linters and type checkers in VS Code only analyze open files. This extension helps you:

- See all TypeScript/ESLint/Python errors across your entire project
- Quickly audit code quality before committing
- Find unused imports, type errors, and lint issues in files you haven't opened

## Installation

### From GitHub

Download the latest packaged `.vsix` from either:

- The latest successful CI run artifact on the [CI workflow](https://github.com/sm18lr88/VS_Code_Check/actions/workflows/ci.yml)
- A tagged [GitHub release](https://github.com/sm18lr88/VS_Code_Check/releases), when available

### From VSIX (Local)

1. Download or build the `.vsix` file
2. In VS Code: `Ctrl+Shift+P` → "Extensions: Install from VSIX..."
3. Select the `.vsix` file

### Build from Source

```bash
git clone https://github.com/sm18lr88/VS_Code_Check.git
cd VS_Code_Check
npm install
npm run ci
npm run package
```

## CI/CD

GitHub Actions runs on pushes to `master`, pull requests, and version tags. The workflow type-checks, builds, packages the extension into a `.vsix`, and uploads it as a downloadable workflow artifact. Tags named like `v1.1.1` also publish a GitHub Release with the VSIX attached.

## License

MIT
