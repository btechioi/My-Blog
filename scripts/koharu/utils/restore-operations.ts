import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { PROJECT_ROOT, RESTORE_MAP } from '../constants';
import { tarExtract, tarList } from './tar';
import { validateBackupFilePath } from './validation';

/** Restore preview item */
export interface RestorePreviewItem {
  /** Target path (e.g., 'src/content/blog') */
  path: string;
  /** File count */
  fileCount: number;
}

/**
 * Get restore preview (does not modify files)
 * @param backupPath Backup file path
 * @returns List of items to be restored
 */
export function getRestorePreview(backupPath: string): RestorePreviewItem[] {
  // Validate backup file
  const validatedPath = validateBackupFilePath(backupPath);

  const rawFiles = tarList(validatedPath);
  // Clean path: remove ./ prefix and trailing slash
  const files = rawFiles.map((f) => f.replace(/^\.\//, '').replace(/\/$/, '')).filter((f) => f && f !== 'manifest.json');

  const previewItems: RestorePreviewItem[] = [];

  for (const [src, dest] of Object.entries(RESTORE_MAP)) {
    // Check if this RESTORE_MAP entry exists in the archive
    const matchingFiles = files.filter((f) => f === src || f.startsWith(`${src}/`));

    if (matchingFiles.length > 0) {
      // Only count actual files (excluding the directory itself)
      const fileCount = matchingFiles.filter((f) => f !== src).length;
      previewItems.push({ path: dest, fileCount: fileCount || 1 });
    }
  }

  return previewItems;
}

/**
 * Execute restore operation
 * @param backupPath Backup file path
 * @returns List of restored files (target paths)
 */
export function restoreBackup(backupPath: string): string[] {
  // Validate backup file
  const validatedPath = validateBackupFilePath(backupPath);

  // Create temporary directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-koharu-restore-'));

  try {
    // Extract to temporary directory
    tarExtract(validatedPath, tempDir);

    const restored: string[] = [];

    // Restore files
    for (const [src, dest] of Object.entries(RESTORE_MAP)) {
      const srcPath = path.join(tempDir, src);
      const destPath = path.join(PROJECT_ROOT, dest);

      if (fs.existsSync(srcPath)) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.cpSync(srcPath, destPath, { recursive: true });
        restored.push(dest);
      }
    }

    return restored;
  } finally {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
