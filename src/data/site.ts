// Site-wide facts used across pages: name, role, profile links, the top-bar navigation and the public repository allow-list.

/** The section a page belongs to. It hides Home on the landing page and marks the current link in the top bar. */
export type PageKey = 'home' | 'profile' | 'projects' | 'blog' | 'other';

/** One link in the top bar: its label, address and the one-line hint shown on hover and keyboard focus. */
export interface NavItem {
  label: string;
  href: string;
  hint: string;
  // True for a section that has nothing to show until a first post is published; its link stays out of the top bar and the landing page until then.
  needsPosts?: boolean;
}

/** The shape of the site-wide facts. Google Scholar is optional until the profile address is confirmed. */
export interface SiteData {
  name: string;
  role: string;
  links: { linkedin: string; github: string; scholar?: string };
  nav: NavItem[];
  publicRepos: string[];
}

export const SITE: SiteData = {
  name: 'Anant Vemuri',
  role: 'Global AI Product Manager at Olympus, Hamburg',
  links: {
    linkedin: 'https://www.linkedin.com/in/anantvemuri',
    github: 'https://github.com/ekmungi',
  },
  nav: [
    { label: 'Home', href: '/', hint: 'Back to the landing page' },
    { label: 'Profile', href: '/profile/', hint: 'Who I am: work, research, publications and education' },
    { label: 'Projects', href: '/projects/', hint: 'Research experiments and the software I build' },
    { label: 'Blog', href: '/blog/', hint: 'What I write about AI in healthcare', needsPosts: true },
  ],
  // The only repositories under github.com/ekmungi that the site may link to; it links to no other.
  publicRepos: [
    'ekmungi.github.io',
    'smart-search',
    'smart-search-mcp',
    'youtube-transcribe',
    'obsidian-database-plugin',
    'ai-meeting-notes',
    'notion-obsidian',
    'obsidian-vault-org',
  ],
};

/**
 * The links to show in the top bar on a given page: all of them, except Home on the landing page and, until a post is published, Blog.
 * @param page - the section the page belongs to.
 * @param blogLive - true once at least one post is published (or shown, in the dev server and the test build). The default, false, keeps
 *   the Blog link out, so an unfinished section is never linked by accident.
 * @returns a new array of nav items, in display order; SITE.nav itself is not changed.
 */
export function navFor(page: PageKey, blogLive = false): NavItem[] {
  return SITE.nav.filter((item) => !(page === 'home' && item.href === '/') && (blogLive || !item.needsPosts));
}

/**
 * Whether a top-bar link is the one for the section the current page belongs to, so it can be marked aria-current.
 * Page keys are the lower-case nav labels; the 'other' key (privacy and similar pages) matches no link.
 * @param label - the link's label, for example 'Profile'.
 * @param page - the section the page belongs to.
 * @returns true when the label names that section.
 */
export function isCurrentNav(label: string, page: PageKey): boolean {
  return label.toLowerCase() === page;
}

/**
 * The aria-current value for a top-bar link. ARIA reserves "page" for the exact page being shown, so a subpage
 * of a section (a research theme page, for example) marks the section's link with "true" instead.
 * @param label - the link's label, for example 'Profile'.
 * @param page - the section the page belongs to.
 * @param subpage - true when the page sits inside the section (a theme page) and is not the section's own page.
 * @returns "page" or "true" for the link of the page's section, and undefined for every other link.
 */
export function navCurrent(label: string, page: PageKey, subpage = false): 'page' | 'true' | undefined {
  if (!isCurrentNav(label, page)) return undefined;
  return subpage ? 'true' : 'page';
}
