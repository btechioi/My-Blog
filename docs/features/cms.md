# CMS (Content Management System)

A standalone CMS for managing blog posts in this Astro project. Built with React, BlockNote editor, and Hono for the backend API.

## Features

- **Dashboard** — View statistics, recent updates, and all posts
- **Post Editor** — Rich text editing with BlockNote, frontmatter editing, TOC generation, and markdown preview
- **Post Management** — Create, edit, toggle draft/publish status, pin posts
- **Category Management** — Create posts with categories and map new categories to URL slugs
- **External Editor Integration** — Open posts directly in VS Code or configured editors

## Quick Start

```bash
# Install CMS dependencies
pnpm cms:install

# Start CMS development server
pnpm cms
```

The CMS runs at `http://localhost:3001` by default.

## Architecture

```plain
cms/
├── src/
│   ├── api/           # Hono API routes (create, read, write, list posts)
│   ├── components/    # React components (PostEditor, Dashboard, etc.)
│   ├── hooks/         # Custom React hooks for state management
│   ├── lib/           # Utilities (API client, config, validation)
│   └── App.tsx        # Main CMS application
├── server.ts          # Hono server entry point
└── vite.config.ts     # Vite configuration
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cms/list` | List posts with filtering and sorting |
| GET | `/api/cms/read/:postId` | Read a single post |
| POST | `/api/cms/create` | Create a new post |
| POST | `/api/cms/write/:postId` | Write/update a post |
| POST | `/api/cms/toggle-draft/:postId` | Toggle draft status |
| POST | `/api/cms/toggle-sticky/:postId` | Toggle sticky status |
| GET | `/api/cms/config` | Get CMS configuration |

## Configuration

CMS reads configuration from `config/site.yaml` in the blog root:

```yaml
dev:
  localProjectPath: '/path/to/project'
  contentRelativePath: 'src/content/blog'
  editors:
    - id: vscode
      name: VS Code
      urlTemplate: 'vscode://file{path}'
```

## Post Frontmatter

Posts support the following frontmatter fields:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Post title |
| `date` | datetime | Publication date |
| `updated` | datetime | Last updated date |
| `description` | string | Post description/excerpt |
| `categories` | string[] | Post categories (hierarchical: `["Category", "Subcategory"]`) |
| `tags` | string[] | Post tags |
| `cover` | string | Cover image URL |
| `link` | string | External link (overrides slug) |
| `subtitle` | string | Post subtitle |
| `draft` | boolean | Draft status (hidden from published posts) |
| `sticky` | boolean | Pin to top of post list |
| `tocNumbering` | boolean | Add numbers to headings |
| `excludeFromSummary` | boolean | Skip AI summary generation |
| `math` | boolean | Enable KaTeX math rendering |
| `quiz` | boolean | Enable quiz interaction |

## Editor Features

### BlockNote Editor

Rich text editing with:
- Headings, paragraphs, lists, quotes
- Code blocks with syntax highlighting (30+ languages)
- Tables, images, dividers
- Inline markdown shortcuts

### Frontmatter Panel

Edit post metadata directly in the sidebar:
- Title, date, description
- Categories (hierarchical with `>` separator)
- Tags (comma-separated)
- Cover image, external link
- Advanced options (draft, sticky, TOC numbering, etc.)

### Table of Contents

Auto-generated from heading blocks. Click to navigate to sections.

### Markdown Preview

Live preview with:
- Shiki syntax highlighting
- Mermaid diagram rendering
- Image lightbox

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + S` | Save post |

## Category Mapping

When you create or edit a post with a new category:

1. The CMS detects categories not in `config/site.yaml`
2. A dialog prompts you to provide URL-friendly slugs
3. Mappings are saved to `config/site.yaml`
4. The category is registered for future use

## External Editors

Configure external editors in `config/site.yaml`:

```yaml
dev:
  editors:
    - id: vscode
      name: VS Code
      icon: devicon-plain:vscode
      urlTemplate: 'vscode://file{path}'
```

The "Open in Editor" button opens the post file in your configured editor.
