# Banu's Blog

A personal blog about technology, embedded systems, robotics, and life. Built with Astro.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:4321](http://localhost:4321)

## Project Structure

```plain
src/
├── content/blog/    # Blog posts (Markdown)
├── components/     # React & Astro components
├── layouts/        # Page layouts
├── lib/            # Utilities
├── hooks/          # React hooks
└── pages/          # Routes
config/
├── site.yaml       # Main configuration
└── i18n-content.yaml
```

## Writing Posts

Create a `.md` file in `src/content/blog/` with frontmatter:

```yaml
---
title: "My Post Title"
date: 2026-01-01
categories:
  - Tools
tags:
  - Embedded
  - Linux
description: "Post description..."
---

Your content here...
```

## Commands

```bash
pnpm dev          # Development server
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm check        # Type checking
pnpm lint:fix     # Lint and format
pnpm cms          # Start CMS (local-only)
```

## Development

```bash
pnpm generate:summaries  # Generate AI summaries
pnpm generate:lqips       # Generate image placeholders
```

## License

MIT
