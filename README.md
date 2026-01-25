# Open All Lintable Files

A VS Code extension that opens all lintable files in your workspace to trigger type checkers and linters, helping you see all problems at once.

## Features

- **Open All Lintable Files** - Opens all code and config files in your workspace
- **Open Folder Files** - Right-click any folder in the Explorer to open only its lintable files
- **Close All Tabs** - Closes all open editor tabs
- **Restore Previous Tabs** - Restores tabs that were open before the last action

### Supported File Types

| Category | Extensions |
|----------|------------|
| JavaScript/TypeScript | `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.mts`, `.cts` |
| Python | `.py`, `.pyi` |
| Web | `.html`, `.css`, `.scss`, `.sass`, `.less`, `.vue`, `.svelte`, `.astro` |
| Config | `.json`, `.jsonc`, `.yaml`, `.yml`, `.toml`, `.xml` |
| Markup | `.md`, `.mdx` |
| Data | `.sql`, `.graphql`, `.gql` |
| Other | `.rs`, `.go`, `.java`, `.kt`, `.cs`, `.cpp`, `.c`, `.h`, `.hpp`, `.rb`, `.php`, `.sh`, `.bash`, `.zsh`, `.ps1` |

### Smart Exclusions

The extension automatically excludes:

- **Directories**: `node_modules`, `.git`, `venv`, `.venv`, `dist`, `build`, `__pycache__`, `.next`, `coverage`, and many more
- **Files**: Lock files (`package-lock.json`, `yarn.lock`, etc.), minified files (`*.min.js`), compiled files, logs, and environment files
- **Large files**: Files over 1MB are skipped
- **Gitignore patterns**: Respects `.gitignore`, `.eslintignore`, and `.prettierignore`

## Usage

### Activity Bar Panel

1. Click the **checklist icon** in the Activity Bar (left sidebar)
2. Click one of the buttons in the panel:
   - **Open All Lintable Files** - Opens files and triggers linters
   - **Close All Tabs** - Closes everything
   - **Restore Previous Tabs** - Undo the last action

### Folder Context Menu

Right-click any folder in the Explorer and select **"Open Folder Files"** to open only lintable files from that specific folder (and its subfolders).

### Command Palette

You can also use the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for "Open All Lintable Files".

## Configuration

- `openAllLintableFiles.openConcurrency` (default: `8`) — How many files to open in parallel. Set to `0` to open all files at once (may freeze VS Code in very large workspaces).

## Why?

Many linters and type checkers in VS Code only analyze open files. This extension helps you:

- See all TypeScript/ESLint/Python errors across your entire project
- Quickly audit code quality before committing
- Find unused imports, type errors, and lint issues in files you haven't opened

## Installation

### From VSIX (Local)

1. Download or build the `.vsix` file
2. In VS Code: `Ctrl+Shift+P` → "Extensions: Install from VSIX..."
3. Select the `.vsix` file

### Build from Source

```bash
git clone https://github.com/sm18lr88/open-all-lintable-files.git
cd open-all-lintable-files
npm install
npm run build
npx @vscode/vsce package
```

## License

MIT
