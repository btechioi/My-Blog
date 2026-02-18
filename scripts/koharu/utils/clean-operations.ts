import fs from 'node:fs';

import { isValidBackupFile, validatePathInBackupDir } from './validation';

/**
 * Deletion result
 */
export interface DeleteResult {
  deletedCount: number;
  freedSpace: number;
  skippedCount: number;
}

/**
 * Delete backup files
 * @param paths List of file paths to delete
 * @returns Deletion result
 */
export function deleteBackups(paths: string[]): DeleteResult {
  let freedSpace = 0;
  let deletedCount = 0;
  let skippedCount = 0;

  for (const filePath of paths) {
    try {
      // Validate that the path is within the backup directory
      const validatedPath = validatePathInBackupDir(filePath);

      if (!isValidBackupFile(validatedPath)) {
        skippedCount++;
        continue;
      }

      const stats = fs.statSync(validatedPath);
      freedSpace += stats.size;
      fs.unlinkSync(validatedPath);
      deletedCount++;
    } catch {
      skippedCount++;
    }
  }

  return { deletedCount, freedSpace, skippedCount };
}
