import * as vscode from "vscode";
import * as path from "node:path";

// Store previous editor state for restore functionality
let previousEditorState: vscode.Uri[] = [];

function saveCurrentEditorState() {
  previousEditorState = vscode.window.tabGroups.all
    .flatMap((group) => group.tabs)
    .map((tab) => {
      if (tab.input instanceof vscode.TabInputText) {
        return tab.input.uri;
      }
      return null;
    })
    .filter((uri): uri is vscode.Uri => uri !== null);
}

const LINTABLE_EXTENSIONS = [
  // JavaScript/TypeScript
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "mts",
  "cts",
  // Python
  "py",
  "pyi",
  // Web
  "html",
  "css",
  "scss",
  "sass",
  "less",
  "vue",
  "svelte",
  "astro",
  // Config
  "json",
  "jsonc",
  "yaml",
  "yml",
  "toml",
  "xml",
  // Markup
  "md",
  "mdx",
  // Data
  "sql",
  "graphql",
  "gql",
  // Other languages
  "rs",
  "go",
  "java",
  "kt",
  "cs",
  "cpp",
  "c",
  "h",
  "hpp",
  "rb",
  "php",
  "sh",
  "bash",
  "zsh",
  "ps1",
];

// Hardcoded directories to always exclude
const EXCLUDED_DIRECTORIES = [
  // Version control
  ".git",
  ~".svn",
  ".hg",
  // Dependencies
  "node_modules",
  "vendor",
  "bower_components",
  "jspm_packages",
  // Python
  "venv",
  ".venv",
  "env",
  ".env",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  "eggs",
  ".eggs",
  "*.egg-info",
  ".tox",
  ".nox",
  // Build outputs
  "dist",
  "build",
  "out",
  "output",
  "target",
  "bin",
  "obj",
  "_build",
  // IDE/Editor
  ".vscode",
  ".idea",
  ".vs",
  ".eclipse",
  ".settings",
  // Caches
  ".cache",
  ".parcel-cache",
  ".turbo",
  ".nx",
  ".angular",
  // Framework specific
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".astro",
  ".vercel",
  ".netlify",
  // Coverage/Testing
  "coverage",
  ".nyc_output",
  "htmlcov",
  // Temporary
  "tmp",
  "temp",
  ".tmp",
  ".temp",
  // Logs
  "logs",
  // Ruby
  ".bundle",
  // Rust
  "target",
  // Go
  "pkg",
  // .NET
  "packages",
  // Misc
  ".terraform",
  ".serverless",
  ".webpack",
  ".docusaurus",
  ".sass-cache",
  "typings",
  ".dynamodb",
];

// Hardcoded files to always exclude
const EXCLUDED_FILES = [
  // Lock files
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "composer.lock",
  "Gemfile.lock",
  "Pipfile.lock",
  "poetry.lock",
  "Cargo.lock",
  "go.sum",
  "packages.lock.json",
  "flake.lock",
  // Minified files
  "*.min.js",
  "*.min.css",
  // Source maps
  "*.map",
  // Compiled
  "*.pyc",
  "*.pyo",
  "*.class",
  "*.dll",
  "*.exe",
  "*.o",
  "*.so",
  // Logs
  "*.log",
  "npm-debug.log*",
  "yarn-debug.log*",
  "yarn-error.log*",
  // Environment files (may contain secrets)
  ".env",
  ".env.*",
  "*.env",
  // DS_Store
  ".DS_Store",
  "Thumbs.db",
];

// Patterns from common ignore files
const IGNORE_FILE_NAMES = [".gitignore", ".eslintignore", ".prettierignore"];

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

function parseIgnoreLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }
  let pattern = trimmed;
  if (pattern.startsWith("/")) {
    pattern = pattern.slice(1);
  }
  if (pattern.endsWith("/")) {
    pattern = pattern.slice(0, -1);
  }
  return pattern;
}

async function readIgnorePatterns(
  workspaceFolder: vscode.Uri,
): Promise<string[]> {
  const patterns: string[] = [];

  for (const ignoreFileName of IGNORE_FILE_NAMES) {
    try {
      const ignoreFileUri = vscode.Uri.joinPath(
        workspaceFolder,
        ignoreFileName,
      );
      const content = await vscode.workspace.fs.readFile(ignoreFileUri);
      const lines = Buffer.from(content).toString("utf-8").split("\n");

      for (const line of lines) {
        const pattern = parseIgnoreLine(line);
        if (pattern) {
          patterns.push(pattern);
        }
      }
    } catch {
      // Ignore file doesn't exist, skip
    }
  }

  return patterns;
}

function buildExcludePattern(additionalPatterns: string[]): string {
  const allPatterns = new Set<string>();

  // Add hardcoded directory patterns
  for (const dir of EXCLUDED_DIRECTORIES) {
    allPatterns.add(`**/${dir}/**`);
  }

  // Add patterns from ignore files
  for (const pattern of additionalPatterns) {
    // Handle negation patterns (we skip them - they're for inclusion)
    if (pattern.startsWith("!")) {
      continue;
    }

    // If pattern contains glob chars, use as-is with ** prefix if needed
    if (pattern.includes("*")) {
      if (pattern.startsWith("**/")) {
        allPatterns.add(pattern);
      } else {
        allPatterns.add(`**/${pattern}`);
      }
    } else {
      // Treat as directory or file name
      allPatterns.add(`**/${pattern}/**`);
      allPatterns.add(`**/${pattern}`);
    }
  }

  return `{${Array.from(allPatterns).join(",")}}`;
}

function shouldExcludeFile(fileName: string): boolean {
  for (const pattern of EXCLUDED_FILES) {
    if (pattern.includes("*")) {
      // Simple glob matching for *.ext patterns
      const regex = new RegExp(
        "^" + pattern.replaceAll(".", String.raw`\.`).replaceAll("*", ".*") + "$",
      );
      if (regex.test(fileName)) {
        return true;
      }
    } else if (fileName === pattern) {
      return true;
    }
  }
  return false;
}

async function closeAllTabs() {
  saveCurrentEditorState();
  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  vscode.window.showInformationMessage("Closed all tabs");
}

async function restoreTabs() {
  if (previousEditorState.length === 0) {
    vscode.window.showWarningMessage("No previous state to restore");
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Restoring tabs...",
      cancellable: true,
    },
    async (progress, token) => {
      let restored = 0;
      for (const uri of previousEditorState) {
        if (token.isCancellationRequested) {
          vscode.window.showInformationMessage(
            `Cancelled. Restored ${restored} of ${previousEditorState.length} tabs.`,
          );
          return;
        }

        try {
          await vscode.window.showTextDocument(uri, {
            preview: false,
            preserveFocus: true,
          });
          restored++;
          progress.report({
            message: `Restoring tabs... (${restored}/${previousEditorState.length})`,
            increment: 100 / previousEditorState.length,
          });
        } catch {
          // Skip files that can't be opened
        }
      }

      vscode.window.showInformationMessage(`Restored ${restored} tabs`);
    },
  );
}

async function filterLintableFiles(
  files: vscode.Uri[],
  token: vscode.CancellationToken,
): Promise<vscode.Uri[]> {
  const filesToOpen: vscode.Uri[] = [];
  for (const file of files) {
    if (token.isCancellationRequested) {
      break;
    }
    const fileName = path.basename(file.fsPath);
    if (shouldExcludeFile(fileName)) {
      continue;
    }
    try {
      const stat = await vscode.workspace.fs.stat(file);
      if (stat.size <= MAX_FILE_SIZE) {
        filesToOpen.push(file);
      }
    } catch {
      // Skip files that can't be accessed
    }
  }
  return filesToOpen;
}

async function openFilesWithProgress(
  filesToOpen: vscode.Uri[],
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  token: vscode.CancellationToken,
): Promise<number> {
  let opened = 0;
  for (const file of filesToOpen) {
    if (token.isCancellationRequested) {
      vscode.window.showInformationMessage(
        `Cancelled. Opened ${opened} of ${filesToOpen.length} files.`,
      );
      return opened;
    }
    try {
      await vscode.window.showTextDocument(file, {
        preview: false,
        preserveFocus: true,
      });
      opened++;
      progress.report({
        message: `Opening files... (${opened}/${filesToOpen.length})`,
        increment: 100 / filesToOpen.length,
      });
    } catch {
      // Skip files that can't be opened
    }
  }
  return opened;
}

async function openAllLintableFiles() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage("No workspace folder open");
    return;
  }

  saveCurrentEditorState();

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Opening lintable files...",
      cancellable: true,
    },
    async (progress, token) => {
      progress.report({ message: "Reading ignore patterns..." });

      // Collect ignore patterns from all workspace folders
      const ignorePatterns: string[] = [];
      for (const folder of workspaceFolders) {
        const patterns = await readIgnorePatterns(folder.uri);
        ignorePatterns.push(...patterns);
      }

      const includePattern = `**/*.{${LINTABLE_EXTENSIONS.join(",")}}`;
      const excludePattern = buildExcludePattern(ignorePatterns);

      progress.report({ message: "Finding files..." });

      const files = await vscode.workspace.findFiles(
        includePattern,
        excludePattern,
      );

      if (token.isCancellationRequested) {
        return;
      }

      const filesToOpen = await filterLintableFiles(files, token);

      if (token.isCancellationRequested) {
        return;
      }

      if (filesToOpen.length === 0) {
        vscode.window.showInformationMessage("No lintable files found");
        return;
      }

      progress.report({ message: `Opening ${filesToOpen.length} files...` });

      const opened = await openFilesWithProgress(filesToOpen, progress, token);

      if (!token.isCancellationRequested) {
        vscode.window.showInformationMessage(`Opened ${opened} lintable files`);
      }
    },
  );
}

class LintableFilesViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "openAllLintableFiles.view";

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this._getHtmlContent();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "openAll":
          await openAllLintableFiles();
          break;
        case "closeAll":
          await closeAllTabs();
          break;
        case "restore":
          await restoreTabs();
          break;
      }
    });
  }

  private _getHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      padding: 10px;
      font-family: var(--vscode-font-family);
    }
    button {
      width: 100%;
      padding: 10px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    p {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      margin-top: 8px;
      margin-bottom: 16px;
      line-height: 1.4;
    }
    hr {
      border: none;
      border-top: 1px solid var(--vscode-widget-border);
      margin: 16px 0;
    }
  </style>
</head>
<body>
  <button id="openAll">Open All Lintable Files</button>
  <p>Opens all code and config files to trigger linters and type checkers. Respects .gitignore and excludes node_modules, venv, build outputs, and files over 1MB.</p>

  <hr>

  <button id="closeAll" class="secondary">Close All Tabs</button>
  <button id="restore" class="secondary">Restore Previous Tabs</button>
  <p>Close all open tabs or restore the tabs that were open before the last action.</p>

  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('openAll').addEventListener('click', () => {
      vscode.postMessage({ command: 'openAll' });
    });
    document.getElementById('closeAll').addEventListener('click', () => {
      vscode.postMessage({ command: 'closeAll' });
    });
    document.getElementById('restore').addEventListener('click', () => {
      vscode.postMessage({ command: 'restore' });
    });
  </script>
</body>
</html>`;
  }
}

export function activate(context: vscode.ExtensionContext) {
  // Register command
  const commandDisposable = vscode.commands.registerCommand(
    "openAllLintableFiles.open",
    openAllLintableFiles,
  );
  context.subscriptions.push(commandDisposable);

  // Register webview provider for activity bar
  const provider = new LintableFilesViewProvider(context.extensionUri);
  const viewDisposable = vscode.window.registerWebviewViewProvider(
    LintableFilesViewProvider.viewType,
    provider,
  );
  context.subscriptions.push(viewDisposable);
}

// Required by VS Code extension API but no cleanup needed
export function deactivate(): void {
  // No resources to dispose
}
