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
const CONFIG_NAMESPACE = "openAllLintableFiles";
const DEFAULT_OPEN_CONCURRENCY = 8;

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

function getOpenConcurrency(totalFiles: number): number {
  const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
  const raw = config.get<number>("openConcurrency", DEFAULT_OPEN_CONCURRENCY);
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return Math.min(DEFAULT_OPEN_CONCURRENCY, totalFiles);
  }
  if (raw <= 0) {
    return totalFiles;
  }
  const value = Math.max(1, Math.floor(raw));
  return Math.min(value, totalFiles);
}

async function tryOpenFile(file: vscode.Uri): Promise<boolean> {
  try {
    await vscode.window.showTextDocument(file, {
      preview: false,
      preserveFocus: true,
    });
    return true;
  } catch {
    return false;
  }
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
  const total = filesToOpen.length;
  const concurrency = getOpenConcurrency(total);
  if (concurrency <= 1) {
    let opened = 0;
    for (const file of filesToOpen) {
      if (token.isCancellationRequested) {
        vscode.window.showInformationMessage(
          `Cancelled. Opened ${opened} of ${total} files.`,
        );
        return opened;
      }
      if (await tryOpenFile(file)) {
        opened++;
      }
      progress.report({
        message: `Opening files... (${opened}/${total})`,
        increment: 100 / total,
      });
    }
    return opened;
  }

  let opened = 0;
  let currentIndex = 0;
  const increment = 100 / total;

  const openNext = async () => {
    while (true) {
      if (token.isCancellationRequested) {
        return;
      }
      const index = currentIndex++;
      if (index >= total) {
        return;
      }
      const file = filesToOpen[index];
      if (await tryOpenFile(file)) {
        opened++;
      }
      progress.report({
        message: `Opening files... (${opened}/${total})`,
        increment,
      });
    }
  };

  const workerCount = Math.min(concurrency, total);
  const workers = Array.from({ length: workerCount }, () => openNext());
  await Promise.all(workers);

  if (token.isCancellationRequested) {
    vscode.window.showInformationMessage(
      `Cancelled. Opened ${opened} of ${total} files.`,
    );
  }
  return opened;
}

function buildExcludePatternFromIgnoreFiles(
  ignorePatterns: string[],
): string {
  const allPatterns = new Set<string>();

  // Only add patterns from ignore files, NOT hardcoded EXCLUDED_DIRECTORIES
  // This allows users to explicitly open excluded folders when they right-click them
  for (const pattern of ignorePatterns) {
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

  return allPatterns.size > 0 ? `{${Array.from(allPatterns).join(",")}}` : "";
}

async function findLintableFilesInFolders(
  folderUris: vscode.Uri[],
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  token: vscode.CancellationToken,
): Promise<vscode.Uri[]> {
  const fileSet = new Set<string>(); // For deduplication
  const allFiles: vscode.Uri[] = [];

  for (let i = 0; i < folderUris.length; i++) {
    if (token.isCancellationRequested) {
      break;
    }

    const folderUri = folderUris[i];
    const folderName = path.basename(folderUri.fsPath);

    progress.report({
      message: `Reading ignore patterns from ${folderName}... (${i + 1}/${folderUris.length})`,
    });

    // Read ignore patterns from this specific folder
    const ignorePatterns = await readIgnorePatterns(folderUri);

    progress.report({
      message: `Finding files in ${folderName}... (${i + 1}/${folderUris.length})`,
    });

    // Create relative pattern scoped to this folder
    const includePattern = new vscode.RelativePattern(
      folderUri,
      `**/*.{${LINTABLE_EXTENSIONS.join(",")}}`,
    );

    // Build exclude pattern WITHOUT hardcoded EXCLUDED_DIRECTORIES
    // This respects user intent when they explicitly select an excluded folder
    const excludePattern = buildExcludePatternFromIgnoreFiles(ignorePatterns);

    // Find files in this folder only
    const filesInFolder = await vscode.workspace.findFiles(
      includePattern,
      excludePattern || undefined,
    );

    // Deduplicate files (important when folders overlap or are nested)
    for (const file of filesInFolder) {
      const filePath = file.toString();
      if (!fileSet.has(filePath)) {
        fileSet.add(filePath);
        allFiles.push(file);
      }
    }
  }

  // Apply additional filtering (file exclusions, size limits)
  return await filterLintableFiles(allFiles, token);
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

async function openFolderLintableFiles(
  folderUri?: vscode.Uri,
  selectedUris?: vscode.Uri[],
): Promise<void> {
  // 1. Determine which folders to process
  let foldersToProcess: vscode.Uri[];
  if (selectedUris && selectedUris.length > 0) {
    foldersToProcess = selectedUris;
  } else if (folderUri) {
    foldersToProcess = [folderUri];
  } else {
    foldersToProcess = [];
  }

  // 2. Validate input
  if (foldersToProcess.length === 0) {
    vscode.window.showWarningMessage("No folder selected");
    return;
  }

  // 3. Filter to only folder URIs (in case files were included)
  const folderUris: vscode.Uri[] = [];
  for (const uri of foldersToProcess) {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type === vscode.FileType.Directory) {
        folderUris.push(uri);
      }
    } catch {
      // Skip invalid URIs
    }
  }

  if (folderUris.length === 0) {
    vscode.window.showWarningMessage("No valid folders selected");
    return;
  }

  // 4. Save editor state for restore functionality
  saveCurrentEditorState();

  // 5. Process with progress indicator
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Opening lintable files from ${folderUris.length} folder(s)...`,
      cancellable: true,
    },
    async (progress, token) => {
      // Find files in selected folders
      const filesToOpen = await findLintableFilesInFolders(
        folderUris,
        progress,
        token,
      );

      if (token.isCancellationRequested) {
        return;
      }

      if (filesToOpen.length === 0) {
        vscode.window.showInformationMessage("No lintable files found");
        return;
      }

      progress.report({ message: `Opening ${filesToOpen.length} files...` });

      // Process and open files
      const opened = await openFilesWithProgress(filesToOpen, progress, token);

      if (!token.isCancellationRequested) {
        vscode.window.showInformationMessage(
          `Opened ${opened} lintable files from selected folder(s)`,
        );
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

  // Register folder context menu command
  const folderCommandDisposable = vscode.commands.registerCommand(
    "openAllLintableFiles.openFolder",
    openFolderLintableFiles,
  );
  context.subscriptions.push(folderCommandDisposable);

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
