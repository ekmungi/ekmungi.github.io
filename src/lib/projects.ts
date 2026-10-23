// Display helpers for the projects pages: the status line, the A-to-Z order of projects, and the order and date format of updates.

/** The project facts that decide the status line. */
interface StatusFacts {
  repo?: string;
  private?: boolean;
  status: string;
}

/**
 * The status line shown on a project tile and page.
 * It is worked out from the project's own facts, so a tile can never say "Public on GitHub" without a repo link
 * or show a link beside "Code private". The written `status` is used only when the project has neither.
 * @param project - the project's `repo`, `private` and `status` fields.
 * @returns "Public on GitHub" when there is a repo, "Code private" when the project is private, otherwise the written status.
 */
export function statusLabel(project: StatusFacts): string {
  if (project.repo) return 'Public on GitHub';
  if (project.private) return 'Code private';
  return project.status;
}

/**
 * Order projects A to Z by title, ignoring case.
 * @param projects - projects, or any objects with `data.title`; the list is not changed.
 * @returns a new, sorted array holding the same projects.
 */
export function sortByTitle<T extends { data: { title: string } }>(projects: T[]): T[] {
  return [...projects].sort((a, b) => a.data.title.localeCompare(b.data.title, 'en', { sensitivity: 'base' }));
}

/**
 * Order a project's updates newest first.
 * @param updates - updates with a `date`; the list is not changed.
 * @returns a new, sorted array holding the same updates.
 */
export function sortUpdatesDesc<T extends { date: Date }>(updates: T[]): T[] {
  return [...updates].sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * Write a date as "21 October 2026".
 * A date written as 2026-10-21 in a content file is read as midnight UTC, so the calendar day is taken in UTC as well.
 * Otherwise a visitor west of Greenwich would see the day before.
 * @param date - the date of an update.
 * @returns the day, the month name in English and the year.
 */
export function formatDay(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
