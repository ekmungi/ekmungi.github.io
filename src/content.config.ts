// Registers the four content collections: each reads Markdown files from its own folder under src/content and checks them against its schema.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { postSchema, projectSchema, researchSchema, profileSchema } from './content/schemas.ts';
import { contentDir } from './lib/content-dir.ts';
import { quietWhenEmpty } from './lib/loaders.ts';

// src/content in every real build; a site test may point a build of its own at fixture content (see src/lib/content-dir.ts).
const CONTENT = contentDir();

// quietWhenEmpty silences only the "no files found" warning, so a folder that is still empty does not
// clutter the build output. A folder with files behaves exactly as with a plain glob().
const posts = defineCollection({
  loader: quietWhenEmpty(glob({ pattern: '**/*.md', base: `${CONTENT}/posts` })),
  schema: postSchema,
});

const projects = defineCollection({
  loader: quietWhenEmpty(glob({ pattern: '**/*.md', base: `${CONTENT}/projects` })),
  schema: projectSchema,
});

const research = defineCollection({
  loader: quietWhenEmpty(glob({ pattern: '**/*.md', base: `${CONTENT}/research` })),
  schema: researchSchema,
});

const profile = defineCollection({
  loader: quietWhenEmpty(glob({ pattern: '**/*.md', base: `${CONTENT}/profile` })),
  schema: profileSchema,
});

export const collections = { posts, projects, research, profile };
