# My Blog — Documentation (English)

This repository contains a modern, English-only blog built with Astro. The documentation in this file provides a concise overview, quick start instructions, and guidance for configuration and deployment. All documentation has been sanitized to remove references to upstream templates, external sites, and non-English content.

## Overview

- Framework: Astro (static site generation)
- UI: React components for interactive parts
- Styling: Tailwind CSS
- Content: Markdown files under `src/content/blog/`
- Language: English only (site and documentation)

This project is intended as a standalone personal blog. It is configured to use English as the single UI and content language.

## Quick start

1. Clone the repository to your machine.
2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:

   ```bash
   pnpm dev
   ```

4. Build for production:

   ```bash
   pnpm build
   pnpm preview
   ```

## Project layout (important paths)

- `src/` — source code, components and pages
- `src/content/blog/` — markdown posts (organize posts into subfolders)
- `src/i18n/` — i18n utilities (kept for internal use; site is English-only)
- `config/site.yaml` — main site configuration (title, navigation, i18n, etc.)
- `config/i18n-content.yaml` — content-level labels (categories/series) in English
- `public/` — static assets

## Configuration highlights

Edit `config/site.yaml` to control site metadata and behavior:

- Site title, description, author, and URL
- Navigation menus and featured categories
- Social links (optional)
- Comment provider and analytics (optional)
- i18n configuration — set to English-only by default

Important: After changing `config/site.yaml`, restart the dev server or rebuild to pick up config changes.

## Internationalization (English-only)

This site is configured to run as English-only:

- `config/site.yaml` should have `defaultLocale: en` and only the `en` locale listed.
- Remove or avoid adding additional locale files under `src/i18n/translations/`.
- Content translations are not required; place posts under `src/content/blog/` using English frontmatter and content.

If you intentionally add more locales later, follow the project's i18n pattern: add a translation file, register it in `src/i18n/translations/index.ts`, and update `config/i18n-content.yaml`.

## Creating and editing posts

- Add Markdown (`.md` or `.mdx`) files to `src/content/blog/`.
- Use frontmatter to set metadata:

  ```yaml
  ---
  title: "Your Post Title"
  date: 2026-01-01
  tags: [tag1, tag2]
  categories: [Category]
  draft: false
  cover: /path/to/image.webp
  ---
  ```

- Draft posts (set `draft: true`) are excluded from production builds.

## CLI utilities

This project includes several npm scripts for common tasks:

- `pnpm dev` — start dev server
- `pnpm build` — build production site
- `pnpm preview` — preview production build locally
- `pnpm check` — type checking and content sync
- `pnpm lint` / `pnpm lint:fix` — linting and auto-fix
- `pnpm format` — format codebase

There may also be project-specific scripts for image processing or content generation under `src/scripts/`. Review them before running.

## Deployment

This project can be deployed to any static-host provider or served from a container. Generic deployment steps:

1. Run `pnpm build` to generate production artifacts.
2. Upload the generated output (usually `dist/` or framework output) to your static hosting provider.
3. Configure redirects and headers on your host as needed.

For containerized deployment, serve the production artifact with a small static server or Nginx.

## Removing template traces and personalization

To ensure the repository appears as a standalone personal site:

- Update `README.md` and `docs/README.en.md` to reflect your site identity.
- Remove or replace any images or links that point to other projects or authors.
- Update `package.json` fields such as `name`, `author`, `repository`, and `homepage` to your values.
- Optionally, remove or redact `CHANGELOG.md` and other contributor histories if you do not want them published. (Be cautious: preserving legal and licensing information is important.)

Note: Do not change the license file unless you have the right to relicense the content.

## Troubleshooting

- If pages show non-English content, check `src/i18n/translations/` and `config/i18n-content.yaml` for leftover locale blocks.
- If routes include unexpected locale prefixes, confirm `config/site.yaml` contains only the `en` locale.
- On type or build errors, run `pnpm check` and follow the diagnostics.

## Contributing and maintenance

This repository is configured for local development. Before committing:

- Run `pnpm lint:fix` to fix formatting and lint issues.
- Run `pnpm check` to ensure types and content are in sync.
- Keep sensitive information (API keys, secrets) out of the repository.

## License

See the repository `LICENSE` file for license details.

## Contact / support

This copy of the project is intended to be used and customized locally. For issues related to your deployment or customizations, manage changes in your own source control and consult project documentation or community resources as appropriate.