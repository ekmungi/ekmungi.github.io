// Astro configuration for ekmungi.github.io: static output, a fixed site address, file-style URLs and a CSS target old enough for Safari 15.
import { defineConfig } from 'astro/config';
import { publicDir as chosenPublicDir } from './src/lib/content-dir.ts';

// The browsers the built CSS must work in. Safari before 16.4 ignores media queries written in the range syntax ("width<=860px"),
// which the CSS minifier writes when every target supports it, so naming Safari 15 keeps breakpoints as "max-width".
const CSS_TARGETS = ['chrome100', 'edge100', 'firefox100', 'safari15'];

export default defineConfig({
  // Public address of the site; used for absolute links and the sitemap.
  site: 'https://ekmungi.github.io',
  // public/ in every real build; a site test may publish the files of a fixture folder instead (see src/lib/content-dir.ts).
  publicDir: chosenPublicDir(),
  build: {
    // 'preserve' keeps each page at the path of its source file, so /privacy.html stays a single
    // file while every folder index.astro still becomes <folder>/index.html.
    format: 'preserve',
  },
  vite: {
    build: {
      cssTarget: CSS_TARGETS,
    },
  },
});
