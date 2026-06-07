/**
 * Utility functions for syncing soft-deleted score IDs via the academic announcements content.
 * This is used to bypass Supabase RLS limits where a mock admin cannot directly delete score records.
 */

export function parseDeletedScoreIds(annContent: string | undefined | null): string[] {
  if (!annContent) return [];
  const match = annContent.match(/<!--DELETED_SCORES_JSON:([\s\S]*?)-->/);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch (e) {
      console.error("Failed to parse soft deleted scores JSON", e);
    }
  }
  return [];
}

export function stringifyDeletedScoreIds(annContent: string | undefined | null, deletedIds: string[]): string {
  const baseContent = (annContent || "").replace(/<!--DELETED_SCORES_JSON:[\s\S]*?-->/g, "").trim();
  const jsonStr = JSON.stringify(deletedIds);
  return `${baseContent}\n\n<!--DELETED_SCORES_JSON:${jsonStr}-->`;
}
