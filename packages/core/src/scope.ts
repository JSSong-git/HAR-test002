import type { Entry, Page } from "har-format";

export function selectPage(pages: Page[], pageId?: string): Page | null {
  if (pages.length === 0) return null;
  if (pageId) {
    return pages.find((p) => p.id === pageId) ?? pages[0] ?? null;
  }
  return pages[0] ?? null;
}

export function entriesForPage(entries: Entry[], pageId: string): Entry[] {
  return entries.filter((e) => e.pageref === pageId);
}
