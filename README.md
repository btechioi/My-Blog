# My Blog

A simple, English-only personal blog built with Astro. This repository contains a standalone blog project intended for personal use and deployment; it is configured to use English as the only UI/content language.

This README has been intentionally written to be generic and English-only so the site appears as a standalone project rather than a theme template.

## Key characteristics

- Static site built with Astro and modern web tooling
- English-only UI and content by default
- Markdown-based posts in `src/content/blog/`
- Configuration-driven: change site behavior via `config/site.yaml`
- Common development tasks are performed with `pnpm`

## Quick start

Requirements:
- Node.js (lts recommended)
- pnpm

Clone the repository and install dependencies:

   plain git clone <your-repository-url>
    cd My-Blog
    pnpm install

Run the development server:

   plain pnpm dev

Build for production:

   plain pnpm build

Preview the production build locally:

   plain pnpm preview

Run type checks and content generation:

   plain pnpm check

Run lint & auto-fix:

   plain pnpm lint:fix

## Project layout (important paths)

- `src/` — source code, components, pages, and content
- `src/content/blog/` — markdown posts (organize by categories as folders)
- `src/i18n/` — UI translation code (kept English-only)
- `config/site.yaml` — main site configuration (title, navigation, social, i18n, featured series, etc.)
- `config/i18n-content.yaml` — content-level labels (category/series names) in English
- `public/` — static assets served as-is

## Ensuring the site is English-only

The site uses a small i18n system. To keep the site English-only:

- Confirm `config/site.yaml` has:

    i18n:
      defaultLocale: en
      locales:
        - code: en
          label: English

- Keep only English translation resources under `src/i18n/translations/` (remove any other locale files such as `ja.ts` or `zh.ts`).
- Keep `config/i18n-content.yaml` populated only for `en:` translations (remove other locale sections).
- The default behavior will then be single-locale (English) with no locale prefixes in URLs.

If you want to re-enable additional locales in the future, add them deliberately to `config/site.yaml` and add corresponding translation files.

## Editing content

- Create or edit Markdown files under `src/content/blog/`.
- Use frontmatter to set `title`, `date`, `tags`, `categories`, `draft`, and `cover`.
- For draft posts, set `draft: true` — drafts are excluded from production builds.

Example file location:

- `src/content/blog/tools/my-post.md`

## Configuration highlights

Edit `config/site.yaml` to control:

- Site metadata: title, author, description, url, avatar
- Navigation and menus
- Featured categories and series
- Social links (GitHub, email, RSS)
- Comment provider and analytics
- i18n (set as English-only per above)

Changes to `config/site.yaml` may require restarting the dev server or rebuilding the site.

## Deployment

This project is suitable for static hosting platforms (Vercel, Netlify) or containerized deployment.

Generic deployment steps:

- Build: `pnpm build`
- Upload the `dist/` (or framework output) folder to your static host
- Configure redirects and headers as needed on your hosting platform

For Docker-based deployment, provide a production build artifact and serve it with a small static server or Nginx.

## Development notes & best practices

- Keep UI strings and content in English only for a single-locale site.
- Avoid including identifiable template or upstream project references if you want the site to appear as a standalone personal blog.
- Run `pnpm lint:fix` before committing changes.
- Keep configuration changes centralized in `config/site.yaml`.
- Do not commit sensitive keys (API keys) to the repository.

## Troubleshooting

- If the site shows non-English UI, check for leftover translation files in `src/i18n/translations/` and remove them.
- If routes include unexpected locale prefixes, confirm `i18n` in `config/site.yaml` contains only the `en` locale and `defaultLocale` is `en`.
- For build or type errors, run `pnpm check` and fix reported TypeScript issues.

## License

See the `LICENSE` file at the repository root for license details.

## Contact / Support

This repository is intended to be used and adapted. For issues related to this particular copy or deployment, manage changes locally and use your platform's support or issue tracker if you maintain a remote repository.