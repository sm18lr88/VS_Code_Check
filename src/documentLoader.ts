import * as vscode from "vscode";

const CONFIG_NAMESPACE = "vsCodeCheck";
const DEFAULT_OPEN_CONCURRENCY = 32;
const PROGRESS_UPDATE_INTERVAL_MS = 250;

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

export async function openFilesWithProgress(
  filesToOpen: readonly vscode.Uri[],
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
