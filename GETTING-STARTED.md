# Getting Started

This document helps you get this English-only Astro blog up and running quickly. It has been sanitized to remove upstream template references and non-English content.

## Requirements

- Node.js (LTS recommended)
- pnpm package manager
- Git (optional for cloning)

## Quick Start — 3 steps

1. Clone or copy the repository
   ```bash
   git clone <your-repo-url> my-blog
   cd my-blog
   ```

2. Install dependencies
   ```bash
   pnpm install
   ```

3. Start the development server
   ```bash
   pnpm dev
   ```
   Then open http://localhost:4321 (or the address shown in the terminal).

## Build & Preview

- Build for production:
  ```bash
  pnpm build
  ```

- Preview the production build locally:
  ```bash
  pnpm preview
  ```

## Project structure (important locations)

- `src/` — source code, components and pages
- `src/content/blog/` — Markdown posts (organize posts in folders by category)
- `src/i18n/` — minimal i18n utilities (site is configured for English-only)
- `config/site.yaml` — main site configuration (title, nav, i18n, social links)
- `config/i18n-content.yaml` — content-level labels (categories/series) in English
- `public/` — static assets (images, icons, etc.)

## Configuration highlights

Open `config/site.yaml` and set site metadata and behavior:

- `site.title`, `site.description`, `site.author`, `site.url`
- Navigation items under `navigation`
- Social links under `social`
- i18n:
  ```yaml
  i18n:
    defaultLocale: en
    locales:
      - code: en
        label: English
  ```
  This project is set up to be English-only by default. Do not add other locales unless you intentionally want multi-language support.

After changing `config/site.yaml`, restart the dev server or rebuild the site so changes take effect.

## Writing content

Add posts to `src/content/blog/`. Each post is a Markdown file with YAML frontmatter.

Example frontmatter:
```yaml
---
title: "My First Post"
slug: my-first-post
date: 2026-01-01 12:00:00
description: "A short summary of the post."
tags:
  - example
  - tutorial
categories:
  - [note, front-end]   # nested category example
draft: false
cover: /img/cover/example.webp
---
```

Guidelines:
- Use ASCII lowercase, hyphen-separated slugs.
- For nested categories, use an array: `- [parent, child]`.
- Set `draft: true` to exclude a post from production builds.

## Category conventions

Recommend a small set of top-level categories, for example:
- `note`
- `tools`
- `life`
- `weekly`

Map display names to slugs in `config/i18n-content.yaml` if needed (kept English-only here).

Paths:
- Single-level: `src/content/blog/life/my-post.md`
- Nested: `src/content/blog/note/front-end/my-post.md`

## Assets & images

Place site images under `public/img/` and reference them with absolute paths (e.g., `/img/avatar.webp`). Replace placeholder images with your own assets to personalize the site.

## Linting & checks

- Lint and format:
  ```bash
  pnpm lint
  pnpm lint:fix
  pnpm format
  ```

- Type and content checks:
  ```bash
  pnpm check
  ```

Run these before committing changes.

## Optional: Containerized deployment (Docker)

A generic Docker workflow:
1. Build the site:
   ```bash
   pnpm build
   ```
2. Serve the `dist/` output with a static server (e.g., nginx or a small Node server) inside a container.

If you have project-specific docker scripts in this repository, review them before executing; they may assume particular environment variables or file paths.

## Deployment platforms

This project can be deployed to static hosts like Vercel, Netlify, or any static-file host. Generic steps:
1. Build the site: `pnpm build`
2. Upload the produced output (`dist/` or framework output dir) to your host
3. Configure custom domain and any redirects as your host requires

## Removing template traces

To make the site appear as your personal project:
- Replace `README.md`, `docs/` content and any example images with your own content.
- Update `package.json` fields: `name`, `author`, `repository`, and `homepage`.
- Remove or replace any external links or images that reference another project.
- Keep licensing information intact unless you are authorized to change it.

## Troubleshooting

- If non-English strings appear, check `src/i18n/translations/` and `config/i18n-content.yaml` for leftover locale files or sections and remove them.
- If pages have unexpected locale prefixes, confirm `config/site.yaml` lists only `en` and `defaultLocale: en`.
- If build fails, run `pnpm check` and follow TypeScript/diagnostic messages.
- For lint issues: `pnpm lint:fix`

## Where to find more documentation

- Project docs: `docs/` (English docs have been sanitized to be generic)
- Configuration reference: `config/site.yaml`
- Content examples: `src/content/blog/`

## Notes

- This repository is configured to be English-only. If you intentionally want to add other languages later, do so deliberately and add the corresponding translation files and configuration entries.
- Preserve the `LICENSE` file unless you have the right to change licensing.

---

If you want, I can:
- Convert other documentation files to English-only,
- Replace any specific images with neutral placeholders,
- Update `package.json` fields to your desired values.

Tell me which of those you'd like next.