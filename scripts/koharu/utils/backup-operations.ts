import fs from 'node:fs';
import path from 'node:path';

import { BACKUP_DIR, BACKUP_ITEMS, type BackupItem, MANIFEST_NAME, PROJECT_ROOT } from '../constants';
import { tarCreate } from './tar';
import { getVersion } from './version';

/**
 * Backup result
 */
export interface BackupResult {
  item: BackupItem;
  success: boolean;
  skipped: boolean;
}

/**
 * Backup output
 */
export interface BackupOutput {
  results: BackupResult[];
  backupFile: string;
  fileSize: number;
  timestamp: string;
}

/**
 * Execute backup operation
 * @param isFullBackup Whether it's a full backup
 * @param onProgress Progress callback
 */
export function runBackup(isFullBackup: boolean, onProgress?: (results: BackupResult[]) => void): BackupOutput {
  // Create backup directory
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  // Generate timestamp
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '-');
  const backupName = `backup-${timestamp}`;
  const tempDir = path.join(BACKUP_DIR, `.tmp-${backupName}`);
  const backupFilePath = path.join(BACKUP_DIR, `${backupName}.tar.gz`);

  // Clean and create temporary directory
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const results: BackupResult[] = [];

  // Filter items to backup
  const itemsToBackup = BACKUP_ITEMS.filter((item) => item.required || isFullBackup);

  // Perform backup
  for (const item of itemsToBackup) {
    const srcPath = path.join(PROJECT_ROOT, item.src);
    const destPath = path.join(tempDir, item.dest);

    if (fs.existsSync(srcPath)) {
      if (item.pattern && fs.statSync(srcPath).isDirectory()) {
        const ext = item.pattern.startsWith('*.') ? item.pattern.slice(1) : null;
        const entries = fs.readdirSync(srcPath, { withFileTypes: true });
        const files = entries.filter((e) => e.isFile() && (!ext || e.name.endsWith(ext)));

        if (files.length > 0) {
          fs.mkdirSync(destPath, { recursive: true });
          for (const file of files) {
            fs.cpSync(path.join(srcPath, file.name), path.join(destPath, file.name));
          }
          results.push({ item, success: true, skipped: false });
        } else {
          results.push({ item, success: false, skipped: true });
        }
      } else {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.cpSync(srcPath, destPath, { recursive: true });
        results.push({ item, success: true, skipped: false });
      }
    } else {
      results.push({ item, success: false, skipped: true });
    }

    onProgress?.([...results]);
  }

  // Generate manifest.json
  const manifest = {
    name: MANIFEST_NAME,
    version: getVersion(),
    type: isFullBackup ? 'full' : 'basic',
    timestamp,
    created_at: now.toISOString(),
    files: Object.fromEntries(results.map((r) => [r.item.dest, r.success])),
  };
  fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Create archive
  tarCreate(backupFilePath, tempDir);

  // Clean up temporary directory
  fs.rmSync(tempDir, { recursive: true, force: true });

  // Get file size
  const stats = fs.statSync(backupFilePath);

  return {
    results,
    backupFile: backupFilePath,
    fileSize: stats.size,
    timestamp,
  };
}
