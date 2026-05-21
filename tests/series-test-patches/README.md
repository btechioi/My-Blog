# Multi-Series Feature Testing Guide

This document describes how to use patch files to test various scenarios of the multi-series feature.

## Prerequisites

```bash
# Ensure working directory is clean
git status

# If there are uncommitted changes, stash them first
git stash
```

---

## Test 1: Add a Second Series (Reading Notes)

**Purpose**: Verify that the multi-series feature works correctly

### Apply Patch

```bash
git apply tests/series-test-patches/01-add-reading-series.patch
```

### Changes Made

- `config/site.yaml`:
  - Added `reading: reading` to categoryMap
  - Added second series config to featuredSeries
  - Added "Reading Notes" item to navigation
- New test article `src/content/blog/reading/test-book.md`

### Verification Steps

1. Start the dev server
   ```bash
   pnpm dev
   ```

2. Check the following pages:
   - [ ] Homepage: should display the "Reading Notes" series' latest article as a highlight card
   - [ ] `/reading`: series page shows correctly with test article
   - [ ] Navigation bar: "Reading Notes" menu item should appear
   - [ ] `/weekly`: weekly page still works correctly

3. Build test
   ```bash
   pnpm build
   ```
   Should complete without errors.

### Revert

```bash
git checkout -- .
rm -rf src/content/blog/reading  # Delete the newly created test article directory
```

---

## Test 2: Disable Weekly Series

**Purpose**: Verify that `enabled: false` correctly disables a series

### Apply Patch

```bash
git apply tests/series-test-patches/02-disable-weekly.patch
```

### Changes Made

- `config/site.yaml`: Changed weekly series `enabled: true` to `enabled: false`

### Verification Steps

1. Start the dev server
   ```bash
   pnpm dev
   ```

2. Check the following:
   - [ ] Homepage: should NOT display the weekly series highlight card
   - [ ] `/weekly`: accessing should return a 404 page
   - [ ] Sidebar: should NOT show the weekly entry

3. Build test
   ```bash
   pnpm build
   ```
   Should complete without errors, and should NOT generate `/weekly` related pages.

### Revert

```bash
git checkout -- .
```

---

## Test 3: Reserved Route Conflict Error

**Purpose**: Verify that using a reserved route as a slug triggers a build error

### Apply Patch

```bash
git apply tests/series-test-patches/03-test-reserved-slug-error.patch
```

### Changes Made

- `config/site.yaml`: Changed slug from `weekly` to `categories` (reserved route)

### Verification Steps

1. Attempt to build
   ```bash
   pnpm build
   ```

2. Expected results:
   - [ ] Build should **fail**
   - [ ] Error message should indicate `categories` is a reserved route
   - [ ] Error message should list all reserved route names

3. Dev mode should also report the error
   ```bash
   pnpm dev
   ```
   - [ ] A configuration error warning should display on startup

### Revert

```bash
git checkout -- .
```

---

## Test 4: Disable Homepage Highlight

**Purpose**: Verify that `highlightOnHome: false` correctly disables the homepage highlight

### Apply Patch

```bash
git apply tests/series-test-patches/04-test-highlight-off.patch
```

### Changes Made

- `config/site.yaml`: Added `highlightOnHome: false` for the weekly series

### Verification Steps

1. Start the dev server
   ```bash
   pnpm dev
   ```

2. Check the following:
   - [ ] Homepage: should **NOT** display the weekly series highlight card
   - [ ] `/weekly`: series page still works correctly
   - [ ] Navigation bar: weekly menu item still exists

3. Build test
   ```bash
   pnpm build
   ```
   Should complete without errors.

### Revert

```bash
git checkout -- .
```

---

## Combined Tests (Optional)

You can also combine multiple patches for more complex testing:

```bash
# Enable Reading Notes series + disable weekly homepage highlight
git apply tests/series-test-patches/01-add-reading-series.patch
git apply tests/series-test-patches/04-test-highlight-off.patch

pnpm dev
# Verify: homepage only shows Reading Notes highlight, not weekly highlight

# Revert
git checkout -- .
rm -rf src/content/blog/reading
```

---

## Quick Reference

| Patch | Test Scenario | Expected Result |
|-------|--------------|-----------------|
| `01-add-reading-series.patch` | Add a second series | Works correctly, both series coexist |
| `02-disable-weekly.patch` | Disable a series | Series page returns 404, no homepage highlight |
| `03-test-reserved-slug-error.patch` | Reserved route conflict | Build fails with error message |
| `04-test-highlight-off.patch` | Disable homepage highlight | Series works but no highlight card on homepage |

---

## After Testing

```bash
# Ensure all changes are reverted
git checkout -- .
rm -rf src/content/blog/reading  # If tested patch 01

# Restore previously stashed changes (if any)
git stash pop
```
