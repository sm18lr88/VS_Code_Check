import * as path from "node:path";
import * as vscode from "vscode";
import {
  buildExcludePattern,
  isInExcludedDirectory,
  isLintableFileName,
  MAX_FILE_SIZE,
  shouldExcludeFile,
} from "./filePolicies";

const FILTER_CONCURRENCY = 64;

function getRelativePathInRoots(
  uri: vscode.Uri,
  rootUris: readonly vscode.Uri[],
): string {
  for (const rootUri of rootUris) {
    const relativePath = path.relative(rootUri.fsPath, uri.fsPath);
    if (
      relativePath &&
      !relativePath.startsWith("..") &&
      !path.isAbsolute(relativePath)
    ) {
      return relativePath;
    }
  }
  return path.basename(uri.fsPath);
}

export async function filterLintableFiles(
  files: readonly vscode.Uri[],
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

export async function findLintableFilesInFolders(
  folderUris: readonly vscode.Uri[],
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  token: vscode.CancellationToken,
): Promise<vscode.Uri[]> {
  const fileSet = new Set<string>();
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

    const filesInFolder = await vscode.workspace.findFiles(
      includePattern,
      excludePattern || undefined,
    );

    for (const file of filesInFolder) {
      const filePath = file.toString();
      if (!fileSet.has(filePath)) {
        fileSet.add(filePath);
        allFiles.push(file);
      }
    }
  }

  return await filterLintableFiles(allFiles, token, folderUris);
}
