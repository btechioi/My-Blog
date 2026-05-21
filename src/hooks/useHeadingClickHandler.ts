/**
 * useHeadingClickHandler Hook
 *
 * A reusable hook for handling heading clicks in TOC.
 * Scroll to the corresponding heading and manage accordion expand state.
 *
 * @example
 * ```tsx
 * function TableOfContents() {
 *   const headings = useHeadingTree();
 *   const { expandedIds, setExpandedIds } = useExpandedState({ headings, activeId });
 *
 *   const handleHeadingClick = useHeadingClickHandler({
 *     headings,
 *     setExpandedIds,
 *   });
 *
 *   return <HeadingList onHeadingClick={handleHeadingClick} />;
 * }
 * ```
 */

import { useCallback } from 'react';
import { findHeadingById, getParentIds, getSiblingIds, type Heading } from './useHeadingTree';

export interface UseHeadingClickHandlerOptions {
  /** Hierarchical heading tree */
  headings: Heading[];
  /** Expanded state setter */
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

/**
 * Handle heading click, scroll to the position and update accordion expand state
 *
 * @param options - configuration options
 * @returns heading click handler function
 *
 * Note: The `headings` dependency is intentional. The headings array comes from useState
 * in useHeadingTree, which provides a stable reference that only changes when the heading
 * structure actually changes (e.g., page navigation). This ensures the handler updates
 * when needed while avoiding unnecessary recreations during normal renders.
 */
export function useHeadingClickHandler({ headings, setExpandedIds }: UseHeadingClickHandlerOptions): (id: string) => void {
  return useCallback(
    (id: string) => {
      const element = document.getElementById(id);
      if (!element) return;

      element.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Get the clicked heading node
      const clickedHeading = findHeadingById(headings, id);
      if (!clickedHeading) return;

      // Collect parent IDs that need to be expanded
      const parentIds = getParentIds(clickedHeading);
      // If the clicked heading has children, also add it to the expand list
      if (clickedHeading.children.length > 0) {
        parentIds.unshift(id);
      }

      if (parentIds.length === 0) return;

      setExpandedIds((prev) => {
        const newSet = new Set(prev);

        // Group parent nodes by level for accordion effect
        const parentsByLevel: { [level: number]: string[] } = {};

        parentIds.forEach((parentId) => {
          const parentHeading = findHeadingById(headings, parentId);
          if (parentHeading) {
            if (!parentsByLevel[parentHeading.level]) {
              parentsByLevel[parentHeading.level] = [];
            }
            parentsByLevel[parentHeading.level].push(parentId);
          }
        });

        // For each level, close sibling nodes, expand current path nodes
        Object.keys(parentsByLevel).forEach((levelStr) => {
          const level = parseInt(levelStr, 10);
          const parentsAtLevel = parentsByLevel[level];

          parentsAtLevel.forEach((parentId) => {
            const parentHeading = findHeadingById(headings, parentId);
            if (parentHeading) {
              // Close sibling nodes
              const siblingIds = getSiblingIds(parentHeading, headings);
              siblingIds.forEach((siblingId) => {
                newSet.delete(siblingId);
              });

              // Expand current node
              newSet.add(parentId);
            }
          });
        });

        return newSet;
      });
    },
    [headings, setExpandedIds],
  );
}
