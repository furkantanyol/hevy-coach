/** Hevy caps list endpoints at 10 per page (exercise_templates at 100). Verified live 2026-09-09. */
export const MAX_PAGE_SIZE = 10;
export const MAX_TEMPLATE_PAGE_SIZE = 100;

export interface Page<T> {
  page: number;
  page_count: number;
  items: T[];
}

/** Walks every page sequentially. Pages are fetched one at a time to stay polite with an undocumented rate limit. */
export async function fetchAll<T>(fetchPage: (page: number) => Promise<Page<T>>): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const result = await fetchPage(page);
    items.push(...result.items);
    if (page >= result.page_count) return items;
  }
}
