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
  "__generated__", // GraphQL codegen, apollo, etc.
  "generated", // common codegen output directory
  "codegen", // codegen output
  "gen", // generated (Go controller-gen, etc.)
  "artifacts", // generic build artifacts
  ".ccls-cache", // C/C++ ccls LSP cache
  ".clangd", // Clangd LSP cache
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

const GLOB_WILDCARD = String.fromCharCode(42);
const REGEX_ANY_CHARS = `.${GLOB_WILDCARD}`;

// Pre-computed lookup structures for efficient path-component filtering
// (defense-in-depth: catches anything that slips through the glob exclude pattern)
const EXCLUDED_DIR_NAMES = new Set<string>(
  EXCLUDED_DIRECTORIES.filter((directory) => !directory.includes(GLOB_WILDCARD)),
);
const EXCLUDED_DIR_GLOB_PATTERNS = EXCLUDED_DIRECTORIES.filter((directory) =>
  directory.includes(GLOB_WILDCARD),
);

export const MAX_FILE_SIZE = 1024 * 1024; // 1MB

function simpleGlobPatternToRegex(pattern: string): RegExp {
  return new RegExp(
    "^" +
      pattern
        .replaceAll(".", String.raw`\.`)
        .replaceAll(GLOB_WILDCARD, REGEX_ANY_CHARS) +
      "$",
  );
}

function isDirComponentExcluded(segment: string): boolean {
  if (EXCLUDED_DIR_NAMES.has(segment)) {
    return true;
  }
  for (const pattern of EXCLUDED_DIR_GLOB_PATTERNS) {
    if (simpleGlobPatternToRegex(pattern).test(segment)) {
      return true;
    }
  }
  return false;
}

/** Returns true if any workspace-relative path segment belongs to an excluded directory. */
export function isInExcludedDirectory(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  for (const segment of normalized.split("/")) {
    if (segment && isDirComponentExcluded(segment)) {
      return true;
    }
  }
  return false;
}

export function buildExcludePattern(): string {
  const allPatterns = new Set<string>();

  for (const directory of EXCLUDED_DIRECTORIES) {
    allPatterns.add(`**/${directory}/**`);
  }

  return `{${Array.from(allPatterns).join(",")}}`;
}

export function shouldExcludeFile(fileName: string): boolean {
  for (const pattern of EXCLUDED_FILES) {
    if (pattern.includes(GLOB_WILDCARD)) {
      if (simpleGlobPatternToRegex(pattern).test(fileName)) {
        return true;
      }
    } else if (fileName === pattern) {
      return true;
    }
  }
  return false;
}

export function isLintableFileName(fileName: string): boolean {
  const normalizedFileName = fileName.toLowerCase();
  if (LINTABLE_FILE_NAMES.has(normalizedFileName)) {
    return true;
  }
  const extension = path.extname(normalizedFileName).slice(1);
  return extension !== "" && LINTABLE_EXTENSION_SET.has(extension);
}
