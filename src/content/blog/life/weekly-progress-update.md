---
title: "Weekly Progress Update: Building the Weekly Blog Page"
date: "2026-03-27"
categories:
  - Weekly
tags:
  - Update
  - Feature
  - Blog
description: "This week I built a weekly blog page for this Astro-powered blog. The goal is to provide readers with a fast snapshot of everything published in the..."
---

This week I built a **weekly blog page** for this Astro-powered blog. The goal is to provide readers with a fast snapshot of everything published in the current ISO week (Monday to Sunday). The new page is available at `/weekly`, and it includes:

- week date range (YYYY-MM-DD start / end)
- a post list for this week (newest first)
- fallback message when no post exists this week

## What was implemented

1. Added a new content helper in src/lib/content/posts.ts:

- getISOWeekRange(date)
- getThisWeeksPosts(locale)
2. Added a dedicated page:

- src/pages/weekly.astro
- multilingual wrapper: src/pages/[lang]/weekly.astro
3. Added i18n keys in src/i18n/translations/zh.ts and src/i18n/translations/en.ts:

- weekly.title, weekly.description, weekly.weekOf, weekly.noPosts, weekly.postCount
4. Linked nav menu in config/site.yaml to /weekly via nav.weekly.

## Why this is useful

- Helps readers quickly discover what’s new this week.
- Supports content momentum and “current sprint” visibility.
- Enables weekly roundup posts or summary which can be added later.

## Next steps

- Add optional query param week=YYYY-WW to browse historical weeks.
- Add weekly post card components with excerpt + reading time.
- Add auto-scheduling by checking post.data.date as soon as new posts are added.

---

Thanks for reading! This is the first progress post to prove the new `/weekly` route works end-to-end.