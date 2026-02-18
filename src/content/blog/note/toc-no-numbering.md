---
title: Disabling TOC Numbering Example
link: toc-no-numbering
catalog: true
tocNumbering: false
date: 2024-01-07 00:00:00
description: Demonstrates how to disable automatic numbering in the table of contents.
tags:
  - TOC
  - Tutorial
categories:
  - Note
---

This post demonstrates how to disable automatic TOC numbering.

## TOC Numbering Feature

By default, astro-koharu uses CSS counters to automatically add hierarchical numbering to the table of contents:

- 1. Chapter One
  - 1.1. Section One
  - 1.2. Section Two
- 2. Chapter Two

## Disabling Numbering

Set `tocNumbering: false` in the frontmatter to disable numbering for a specific post:

```yaml
---
title: My Post
tocNumbering: false
---