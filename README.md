# PATTTTERNS Docs site

The docs site source and Astro Starlight app live in this repository. Markdown
source remains in the private `pabliqe/patttterns-next/docs` repository; the
publishing workflow in that repository checks out this app, stages the Markdown
into Starlight's content collection, adds missing page titles, and resolves
legacy extensionless links. SQL files and Jekyll-only assets are not published.

For local development, clone `pabliqe/patttterns-next` next to this repository,
then run from this repository root:

```sh
npm ci
npm run dev
```

Changes to `pabliqe/patttterns-next/docs` automatically build and publish the
site to this repository's `gh-pages` branch. GitHub Pages must use that branch
as its source. To publish changes to this Astro app, manually run the
`Publish Docs` workflow in `pabliqe/patttterns-next`. Generated files are not
committed to `main`; the existing root-level static site remains there as a
rollback until the first Pages deployment is verified.
