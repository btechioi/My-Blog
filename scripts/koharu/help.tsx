import { Box, Text } from 'ink';
import { useEffect } from 'react';
import { AUTO_EXIT_DELAY, usePressAnyKey, useRetimer } from './shared';

interface HelpAppProps {
  showReturnHint?: boolean;
  onComplete?: () => void;
}

export function HelpApp({ showReturnHint = false, onComplete }: HelpAppProps) {
  const retimer = useRetimer();

  // Listen for any key press to return to the main menu
  usePressAnyKey(showReturnHint, () => {
    onComplete?.();
  });

  // If return hint is not shown, exit directly
  useEffect(() => {
    if (!showReturnHint) {
      retimer(setTimeout(() => onComplete?.(), AUTO_EXIT_DELAY));
    }
    return () => retimer();
  }, [showReturnHint, onComplete, retimer]);

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Usage:</Text>
        <Text> pnpm koharu Interactive main menu</Text>
        <Text> pnpm koharu new Create new content</Text>
        <Text> pnpm koharu backup Backup blog content and configuration</Text>
        <Text> pnpm koharu restore Restore from backup</Text>
        <Text> pnpm koharu generate Generate content assets</Text>
        <Text> pnpm koharu clean Clean old backups</Text>
        <Text> pnpm koharu list View all backups</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Backup Options:</Text>
        <Text> --full Full backup (includes all images and assets)</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Restore Options:</Text>
        <Text> --latest Restore from the latest backup</Text>
        <Text> --dry-run Preview the files that will be restored</Text>
        <Text> --force Skip confirmation prompts</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Clean Options:</Text>
        <Text> --keep N Keep the last N backups and delete the rest</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Generate Options:</Text>
        <Text> pnpm koharu generate lqips Generate LQIP placeholders</Text>
        <Text> pnpm koharu generate similarities Generate similarity vectors</Text>
        <Text> pnpm koharu generate summaries Generate AI summaries</Text>
        <Text> pnpm koharu generate all Generate all</Text>
        <Text> --model {'<name>'} Specify LLM model</Text>
        <Text> --force Force regeneration</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Update Options:</Text>
        <Text> --check Check for updates only (without executing)</Text>
        <Text> --skip-backup Skip the backup step</Text>
        <Text> --force Skip confirmation prompts</Text>
        <Text> --tag {'<version>'} Specify the target version (e.g., v2.0.0)</Text>
        <Text> --rebase Use rebase mode (rewrites history, forces backup)</Text>
        <Text> --clean Use clean mode (zero conflicts, forces backup)</Text>
        <Text> --dry-run Preview operations (without actual execution)</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>New Options:</Text>
        <Text> pnpm koharu new Interactively select content type</Text>
        <Text> pnpm koharu new post Create a new blog post</Text>
        <Text> pnpm koharu new friend Create a new friend link</Text>
      </Box>

      <Box flexDirection="column">
        <Text bold>General Options:</Text>
        <Text> --help, -h Show help information</Text>
      </Box>

      {showReturnHint && (
        <Box marginTop={1}>
          <Text dimColor>Press any key to return to the main menu...</Text>
        </Box>
      )}
    </Box>
  );
}
