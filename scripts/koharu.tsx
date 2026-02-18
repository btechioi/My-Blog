import fs from 'node:fs';
import path from 'node:path';
import { Box, render, Text, useApp } from 'ink';
import { useState } from 'react';
import { BackupApp } from './koharu/backup.js';
import { CleanApp } from './koharu/clean.js';
import { CycleSelect as Select } from './koharu/components';
import { GenerateApp } from './koharu/generate.js';
import { HelpApp } from './koharu/help.js';
import { ListApp } from './koharu/list.js';
import { NewApp } from './koharu/new.js';
import { RestoreApp } from './koharu/restore.js';
import { BACKUP_DIR, getBackupList, parseArgs } from './koharu/shared.js';
import { UpdateApp } from './koharu/update.js';

const args = parseArgs();

// Show help
if (args.help) {
  console.log(`
koharu - astro-koharu CLI

Usage:
  pnpm koharu              Interactive main menu
  pnpm koharu backup       Backup blog content and configuration
  pnpm koharu restore      Restore from backup
  pnpm koharu update       Update theme
  pnpm koharu clean        Clean old backups
  pnpm koharu list         View all backups
  pnpm koharu generate     Generate content assets
  pnpm koharu new          Create new content

Backup Options:
  --full                   Full backup (includes all images and assets)

Restore Options:
  --latest                 Restore from the latest backup
  --dry-run                Preview the files that will be restored
  --force                  Skip confirmation prompts

Update Options:
  --check                  Check for updates only (without executing)
  --skip-backup            Skip the backup step
  --force                  Skip confirmation prompts
  --tag <version>          Specify the target version (e.g., v2.0.0)
  --rebase                 Use rebase mode (rewrites history, forces backup)
  --clean                  Use clean mode (zero conflicts, forces backup)
  --dry-run                Preview the operations (without actual execution)

Clean Options:
  --keep N                 Keep the last N backups and delete the rest

Generate Options:
  pnpm koharu generate lqips        Generate LQIP image placeholders
  pnpm koharu generate similarities Generate similarity vectors
  pnpm koharu generate summaries    Generate AI summaries
  pnpm koharu generate all          Generate all
  --model <name>                    Specify the LLM model (for summaries)
  --force                           Force regeneration (for summaries)

New Options:
  pnpm koharu new                   Interactively select content type
  pnpm koharu new post              Create a new blog post
  pnpm koharu new friend            Create a new friend link

General Options:
  --help, -h               Show help information
`);
  process.exit(0);
}

type AppMode = 'menu' | 'backup' | 'restore' | 'update' | 'clean' | 'list' | 'help' | 'generate' | 'new';

function KoharuApp() {
  const { exit } = useApp();
  // Determine if entering from the main menu (no command-line arguments)
  const [fromMenu] = useState(() => !args.command);
  const [mode, setMode] = useState<AppMode>(() => {
    // Decide the initial mode based on command-line arguments
    if (args.command === 'backup') return 'backup';
    if (args.command === 'restore') return 'restore';
    if (args.command === 'update') return 'update';
    if (args.command === 'clean') return 'clean';
    if (args.command === 'list') return 'list';
    if (args.command === 'help') return 'help';
    if (args.command === 'generate') return 'generate';
    if (args.command === 'new') return 'new';
    return 'menu';
  });

  const handleComplete = () => {
    if (fromMenu) {
      // If entered from the main menu, return to the main menu
      setMode('menu');
    } else {
      // If entered directly from the command line, exit after completion
      setTimeout(() => exit(), 100);
    }
  };

  const handleMenuSelect = (value: string) => {
    if (value === 'exit') {
      exit();
      return;
    }
    setMode(value as AppMode);
  };

  // Get the backup file for restoration
  const getRestoreBackupFile = (): string | undefined => {
    if (args.latest) {
      const backups = getBackupList();
      if (backups.length > 0) {
        return backups[0].path;
      }
    } else if (args.backupFile) {
      if (fs.existsSync(args.backupFile)) {
        return args.backupFile;
      }
      const inBackupDir = path.join(BACKUP_DIR, args.backupFile);
      if (fs.existsSync(inBackupDir)) {
        return inBackupDir;
      }
    }
    return undefined;
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="magenta">
          koharu
        </Text>
        <Text dimColor> - astro-koharu CLI</Text>
      </Box>

      {mode === 'menu' && (
        <Box flexDirection="column">
          <Text>Please select an action:</Text>
          <Select
            visibleOptionCount={10}
            options={[
              { label: 'New - Create a blog post or friend link', value: 'new' },
              { label: 'Backup - Backup blog content and configuration', value: 'backup' },
              { label: 'Restore - Restore from a backup', value: 'restore' },
              { label: 'Update - Update the theme', value: 'update' },
              { label: 'Generate - Generate content assets (LQIP, similarities, summaries)', value: 'generate' },
              { label: 'Clean - Clean up old backups', value: 'clean' },
              { label: 'List - View all backups', value: 'list' },
              { label: 'Help - View command usage', value: 'help' },
              { label: 'Exit', value: 'exit' },
            ]}
            onChange={handleMenuSelect}
          />
        </Box>
      )}

      {mode === 'backup' && <BackupApp initialFull={args.full} showReturnHint={fromMenu} onComplete={handleComplete} />}

      {mode === 'restore' && (
        <RestoreApp
          initialBackupFile={getRestoreBackupFile()}
          dryRun={args.dryRun}
          force={args.force}
          showReturnHint={fromMenu}
          onComplete={handleComplete}
        />
      )}

      {mode === 'update' && (
        <UpdateApp
          checkOnly={args.check}
          skipBackup={args.skipBackup}
          force={args.force}
          targetTag={args.tag || undefined}
          rebase={args.rebase}
          dryRun={args.dryRun}
          clean={args.clean}
          showReturnHint={fromMenu}
          onComplete={handleComplete}
        />
      )}

      {mode === 'clean' && <CleanApp keepCount={args.keep} showReturnHint={fromMenu} onComplete={handleComplete} />}

      {mode === 'list' && <ListApp showReturnHint={fromMenu} onComplete={handleComplete} />}

      {mode === 'help' && <HelpApp showReturnHint={fromMenu} onComplete={handleComplete} />}

      {mode === 'generate' && (
        <GenerateApp
          initialType={args.generateType || undefined}
          initialModel={args.model || undefined}
          force={args.force}
          showReturnHint={fromMenu}
          onComplete={handleComplete}
        />
      )}

      {mode === 'new' && (
        <NewApp initialType={args.newType || undefined} showReturnHint={fromMenu} onComplete={handleComplete} />
      )}
    </Box>
  );
}

render(<KoharuApp />);
