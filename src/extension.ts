import * as vscode from "vscode";
import * as path from "node:path";

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
  // Common compiled languages
  "rs",
  "go",
  "java",
  "kt",
  "cs",
  "cpp",
  "c",
  "h",
  "hpp",
  "cc",
  "cxx",
  "hxx",
  // Scripting languages
  "rb",
  "php",
  "sh",
  "bash",
  "zsh",
  "ps1",
  "pl",
  "pm",
  "lua",
  "r",
  "R",
  // Mobile/Native
  "swift",
  "m",
  "mm",
  "dart",
  // Functional languages
  "scala",
  "clj",
  "cljs",
  "cljc",
  "edn",
  "ex",
  "exs",
  "erl",
  "hrl",
  "hs",
  "lhs",
  "fs",
  "fsx",
  "fsi",
  "ml",
  "mli",
  "jl",
  // System languages
  "zig",
  "nim",
  "cr",
  "d",
  "v",
  // ActionScript/Adobe
  "as",
  "mxml",
  // JVM languages
  "groovy",
  "gradle",
  "kts",
  // Infrastructure as Code
  "tf",
  "tfvars",
  "hcl",
  "dockerfile",
  // Build systems
  "make",
  "cmake",
  "gradle",
  "bazel",
  // Protocol/IDL
  "proto",
  "thrift",
  "avsc",
  // Shaders
  "glsl",
  "hlsl",
  "wgsl",
  "frag",
  "vert",
  "shader",
  // Blockchain/Smart Contracts
  "sol",
  "move",
  "cairo",
  // Other specialized
  "vb",
  "vba",
  "vbs",
  "bat",
  "cmd",
  "asm",
  "s",
  "f",
  "f90",
  "f95",
  "pas",
  "pp",
  "lisp",
  "lsp",
  "cl",
  "scm",
  "rkt",
  "vim",
  "tex",
  "sas",
  "do",
  "ado",
];

const LINTABLE_EXTENSION_SET = new Set(LINTABLE_EXTENSIONS);
const LINTABLE_FILE_NAMES = new Set([
  "dockerfile",
  "makefile",
  "gnumakefile",
  "cmakelists.txt",
]);

// Hardcoded directories to always exclude
const EXCLUDED_DIRECTORIES = [
  // Version control
  ".git",
  ".svn",
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
  ".pytest_tmp",
  "__pypackages__",
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
  // AI tool workspaces
  ".claude",
  ".agents",
  ".codex",
  ".sisyphus",
  ".cursor",
  ".aider",
  ".continue",
  // Performance & quality tools
  ".pf",
  ".sonar",
  ".codacy",
  ".qodana",
  // Caches
  ".cache",
  ".parcel-cache",
  ".turbo",
  ".nx",
  ".angular",
  ".yarn",
  "__snapshots__",
  "storybook-static",
  ".expo",
  // Framework specific
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".astro",
  ".vercel",
  ".netlify",
  // JVM build tools
  ".gradle",
  ".metals",
  ".bloop",
  ".ammonite",
  // Elixir
  "deps",
  ".mix",
  ".hex",
  // Haskell/Elm
  ".stack-work",
  "elm-stuff",
  // Dart/Flutter
  ".dart_tool",
  // iOS/macOS
  "Pods",
  "DerivedData",
  "xcuserdata",
  // Static site output
  "_site",
  // Cloud/DevOps
  ".firebase",
  ".wrangler",
  ".pulumi",
  // Coverage/Testing
  "coverage",
  ".nyc_output",
  "htmlcov",
  // Temporary
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
  ".nuget",
  // Generic build/generated artifacts
  "__generated__",   // GraphQL codegen, apollo, etc.
  "generated",       // common codegen output directory
  "codegen",         // codegen output
  "gen",             // generated (Go controller-gen, etc.)
  "artifacts",       // generic build artifacts
  ".ccls-cache",     // C/C++ ccls LSP cache
  ".clangd",         // Clangd LSP cache
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
  "uv.lock",
  "bun.lockb",
  "deno.lock",
  "mix.lock",
  "Podfile.lock",
  "pubspec.lock",
  "Package.resolved",
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
  // Generated source files (auto-overwritten, not user-editable)
  // Dart/Flutter (build_runner, freezed, mockito)
  "*.g.dart",
  "*.freezed.dart",
  "*.mocks.dart",
  // Go (go generate, controller-gen, protoc-gen-go)
  "*.pb.go",
  "*_generated.go",
  "*.gen.go",
  "zz_generated.*.go",
  // Python protobuf/gRPC (protoc)
  "*_pb2.py",
  "*_pb2_grpc.py",
  "*_pb2.pyi",
  // JavaScript/TypeScript protobuf (protoc-gen-js, ts-proto)
  "*_pb.js",
  "*_pb.ts",
  "*_grpc_pb.js",
  "*_grpc_web_pb.js",
  // TypeScript/JavaScript GraphQL codegen (graphql-code-generator, apollo)
  "*.generated.ts",
  "*.generated.tsx",
  "*.generated.js",
  // Snapshot files (Jest, Vitest, etc.)
  "*.snap",
];

// Pre-computed lookup structures for efficient path-component filtering
// (defense-in-depth: catches anything that slips through the glob exclude pattern)
const EXCLUDED_DIR_NAMES = new Set<string>(
  EXCLUDED_DIRECTORIES.filter((d) => !d.includes("*")),
);
const EXCLUDED_DIR_GLOB_PATTERNS = EXCLUDED_DIRECTORIES.filter((d) =>
  d.includes("*"),
);

function isDirComponentExcluded(segment: string): boolean {
  if (EXCLUDED_DIR_NAMES.has(segment)) {
    return true;
  }
  for (const pattern of EXCLUDED_DIR_GLOB_PATTERNS) {
    const regex = new RegExp(
      "^" +
        pattern.replaceAll(".", String.raw`\.`).replaceAll("*", ".*") +
        "$",
    );
    if (regex.test(segment)) {
      return true;
    }
  }
  return false;
}

/** Returns true if any workspace-relative path segment belongs to an excluded directory. */
function isInExcludedDirectory(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  for (const segment of normalized.split("/")) {
    if (segment && isDirComponentExcluded(segment)) {
      return true;
    }
  }
  return false;
}

function getRelativePathInRoots(
  uri: vscode.Uri,
  rootUris: readonly vscode.Uri[],
): string {
  for (const rootUri of rootUris) {
    const relativePath = path.relative(rootUri.fsPath, uri.fsPath);
    if (relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath)) {
      return relativePath;
    }
  }
  return path.basename(uri.fsPath);
}

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const CONFIG_NAMESPACE = "vsCodeCheck";
const DEFAULT_OPEN_CONCURRENCY = 32;
const FILTER_CONCURRENCY = 64;
const PROGRESS_UPDATE_INTERVAL_MS = 250;

function buildExcludePattern(): string {
  const allPatterns = new Set<string>();

  for (const dir of EXCLUDED_DIRECTORIES) {
    allPatterns.add(`**/${dir}/**`);
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

function isLintableFileName(fileName: string): boolean {
  const normalizedFileName = fileName.toLowerCase();
  if (LINTABLE_FILE_NAMES.has(normalizedFileName)) {
    return true;
  }
  const extension = path.extname(normalizedFileName).slice(1);
  return extension !== "" && LINTABLE_EXTENSION_SET.has(extension);
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

async function tryLoadFileForDiagnostics(file: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.openTextDocument(file);
    return true;
  } catch {
    return false;
  }
}

async function filterLintableFiles(
  files: vscode.Uri[],
  token: vscode.CancellationToken,
  rootUris: readonly vscode.Uri[],
): Promise<vscode.Uri[]> {
  const filesToOpen: vscode.Uri[] = [];
  let currentIndex = 0;

  const filterNext = async () => {
    while (true) {
      if (token.isCancellationRequested) {
        return;
      }
      const index = currentIndex++;
      if (index >= files.length) {
        return;
      }

      const file = files[index];
      const relativePath = getRelativePathInRoots(file, rootUris);
      if (isInExcludedDirectory(relativePath)) {
        continue;
      }
      const fileName = path.basename(file.fsPath);
      if (!isLintableFileName(fileName) || shouldExcludeFile(fileName)) {
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
  };

  const workerCount = Math.min(FILTER_CONCURRENCY, files.length);
  await Promise.all(Array.from({ length: workerCount }, () => filterNext()));
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
      if (await tryLoadFileForDiagnostics(file)) {
        opened++;
      }
      progress.report({
        message: `Loading files for diagnostics... (${opened}/${total})`,
        increment: 100 / total,
      });
    }
    return opened;
  }

  let opened = 0;
  let currentIndex = 0;
  const increment = 100 / total;
  let lastProgressUpdate = 0;
  let lastReportedOpened = 0;

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
      if (await tryLoadFileForDiagnostics(file)) {
        opened++;
      }
      const now = Date.now();
      if (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL_MS) {
        const openedSinceLastReport = opened - lastReportedOpened;
        lastReportedOpened = opened;
        lastProgressUpdate = now;
        progress.report({
          message: `Loading files for diagnostics... (${opened}/${total})`,
          increment: increment * openedSinceLastReport,
        });
      }
    }
  };

  const workerCount = Math.min(concurrency, total);
  const workers = Array.from({ length: workerCount }, () => openNext());
  await Promise.all(workers);

  if (opened > lastReportedOpened) {
    progress.report({
      message: `Loading files for diagnostics... (${opened}/${total})`,
      increment: increment * (opened - lastReportedOpened),
    });
  }

  if (token.isCancellationRequested) {
    vscode.window.showInformationMessage(
      `Cancelled. Opened ${opened} of ${total} files.`,
    );
  }
  return opened;
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
      message: `Finding files in ${folderName}... (${i + 1}/${folderUris.length})`,
    });

    const includePattern = new vscode.RelativePattern(folderUri, "**/*");

    const excludePattern = buildExcludePattern();

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
  return await filterLintableFiles(allFiles, token, folderUris);
}

async function checkWorkspace() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage("No workspace folder open");
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Diagnosing workspace...",
      cancellable: true,
    },
    async (progress, token) => {
      const includePattern = "**/*";
      const excludePattern = buildExcludePattern();

      progress.report({ message: "Finding files..." });

      const files = await vscode.workspace.findFiles(
        includePattern,
        excludePattern,
      );

      if (token.isCancellationRequested) {
        return;
      }

      const filesToOpen = await filterLintableFiles(
        files,
        token,
        workspaceFolders.map((folder) => folder.uri),
      );

      if (token.isCancellationRequested) {
        return;
      }

      if (filesToOpen.length === 0) {
        vscode.window.showInformationMessage("No lintable files found");
        return;
      }

      progress.report({
        message: `Loading ${filesToOpen.length} files for diagnostics...`,
      });

      const opened = await openFilesWithProgress(filesToOpen, progress, token);

      if (!token.isCancellationRequested) {
        vscode.window.showInformationMessage(
          `Loaded ${opened} lintable files for diagnostics`,
        );
      }
    },
  );
}

async function checkFolder(
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

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Diagnosing ${folderUris.length} folder(s)...`,
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

      progress.report({
        message: `Loading ${filesToOpen.length} files for diagnostics...`,
      });

      const opened = await openFilesWithProgress(filesToOpen, progress, token);

      if (!token.isCancellationRequested) {
        vscode.window.showInformationMessage(
          `Loaded ${opened} lintable files from selected folder(s) for diagnostics`,
        );
      }
    },
  );
}

export function activate(context: vscode.ExtensionContext): void {
  const workspaceCommandDisposable = vscode.commands.registerCommand(
    "vsCodeCheck.checkWorkspace",
    checkWorkspace,
  );
  context.subscriptions.push(workspaceCommandDisposable);

  const folderCommandDisposable = vscode.commands.registerCommand(
    "vsCodeCheck.checkFolder",
    checkFolder,
  );
  context.subscriptions.push(folderCommandDisposable);

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  statusBarItem.text = "$(pulse) Code Check";
  statusBarItem.tooltip = "Re-diagnose all lintable workspace files";
  statusBarItem.command = "vsCodeCheck.checkWorkspace";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

// Required by VS Code extension API but no cleanup needed
export function deactivate(): void {
  // No resources to dispose
}
