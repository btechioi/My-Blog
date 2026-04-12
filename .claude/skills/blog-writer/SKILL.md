---
name: blog-writer
description: Help the user create a new blog post following this project's conventions. Generate correct frontmatter, choose appropriate category paths, and provide a Markdown content scaffold.
---

# Blog Writer Skill (English-only)

This skill helps create new blog posts that follow this repository's content conventions. It generates a complete frontmatter block, suggests an appropriate file path based on selected categories, and produces a Markdown scaffold with recommended sections and examples.

## When to use

Run this skill when a user asks to:
- Create a new blog post
- Generate a post template with frontmatter
- Suggest categories, tags, and slug
- Produce an outline or initial content for a post

## Data to collect (if not provided by the user)

- Title
- Category (choose from existing categories or propose a new one)
- Short description (one sentence)
- Tags (3–6 suggested tags)
- Desired slug (optional — otherwise auto-generate from title)
- Draft status (true/false)
- Date (defaults to current date/time if omitted)
- Any special features: infographic, code examples, diagrams, cover image

## Frontmatter template

Provide this frontmatter at the top of the Markdown file.

```yaml
---
title: "Your Post Title"
slug: your-post-slug
date: 2026-01-01 12:00:00
description: "One-sentence summary (50-120 characters)."
tags:
  - tag1
  - tag2
categories:
  - [category, subcategory] # Use array for nested categories
draft: false
cover: /img/cover/example.webp    # optional
---
```

Notes:
- `slug` should be lowercase, with words separated by hyphens.
- For a single-level category use `categories: category-slug` or `categories: [category]`.
- For nested categories use `categories: - [parent, child]` (example shown above).
- Set `draft: true` to keep the post out of production builds.

## File path rules

- Base content directory: `src/content/blog/`
- Map categories to directory slugs. Example mapping (project-specific):
  - `notes` -> `note`
  - `tools` -> `tools`
  - `life` -> `life`
  - `weekly` -> `weekly`
- Derived path examples:
  - Single-level: `src/content/blog/life/my-post.md`
  - Nested: `src/content/blog/note/front-end/my-post.md`
- File name: `{slug}.md` (append `.md`)

## Naming conventions

- File names and slugs use lowercase ASCII letters, numbers, and hyphens.
- Avoid spaces, punctuation, and non-ASCII characters in slugs.
- Examples:
  - Good: `react-hooks-best-practices.md`
  - Bad: `React Hooks: Best Practices!.md`

## Suggested post scaffold

Below is a recommended Markdown structure you can generate for most posts.

```markdown
---
title: "Example Post Title"
slug: example-post-title
date: 2026-01-01 12:00:00
description: "A concise summary of this post."
tags:
  - javascript
  - react
categories:
  - [note, front-end]
draft: false
cover: /img/cover/example.webp
---

# Example Post Title

> A short lead or summary sentence.

## Background / Motivation

Explain the problem or context that motivated this post.

## Solution / Approach

Describe the approach, algorithm, or steps taken.

### Key Point 1

Provide details, reasoning, and small code snippets:

```js
// Example code block
const greet = (name) => `Hello, ${name}`;
```

### Key Point 2

More details and examples.

## Practical Results / Examples

Show real outputs, screenshots, or performance notes.

## Summary & Takeaways

Summarize the main points and recommendations.

## References

- Link 1
- Link 2
```plain

## Category guidance

- Prefer a small set of top-level categories (e.g., `note`, `tools`, `life`, `weekly`).
- Map human-readable names to slugs in the project config if translations or display names differ.
- If adding a new category:
  1. Update the project's category map (configuration).
  2. Create the matching folder under `src/content/blog/`.
  3. Use the agreed slug in frontmatter and file path.

## Tag suggestions

- Pick 3–6 tags focused on topics covered by the post.
- Tags should be short, lowercase, and hyphen-separated if multi-word (e.g., `performance-optimization`).

## Infographic / diagrams suggestions

If the user wants infographic or diagram help, recommend:
- Use `@antv/infographic` components for structured visual lists or comparisons.
- Use Mermaid for sequence diagrams or flowcharts.
- Include caption and accessible alternative text for complex images.

## Finalization checklist (before saving)

- [ ] Frontmatter fields are complete and correct
- [ ] Slug follows naming rules
- [ ] Categories map to existing folder structure (or new folder created)
- [ ] Draft flag set correctly
- [ ] Code blocks have language hints (```js, ```ts, ```bash, etc.)
- [ ] Images referenced exist under `public/` or `src/assets/`
- [ ] Run linter / formatter: `pnpm lint:fix` (project command)

## Example interactions

### Example 1 — User supplies title and category

User: "Write a blog post scaffold for 'Improving React Performance' under category 'note > front-end'."

The skill should:
- Generate a slug: `improving-react-performance`
- Produce frontmatter with provided category
- Provide the Markdown scaffold with suggested sections and a small React code example

### Example 2 — User requests new category

User: "Create a post about Docker deployment under a new category 'deploy'."

The skill should:
1. Ask for confirmation to add a new category slug (e.g., `deploy`).
2. If confirmed:
   - Suggest updating the category map configuration.
   - Suggest creating `src/content/blog/deploy/`.
   - Produce the post scaffold using `categories: deploy`.

## Notes for maintainers

- This skill produces English-only output.
- It avoids referencing external template project names or upstream authors.
- Always validate any new category slugs against your project's `config/site.yaml` and directory structure.
