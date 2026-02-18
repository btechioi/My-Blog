---
title: Example Weekly Vol.1
link: weekly-example-1
catalog: true
date: 2024-01-04 00:00:00
description: This is an example weekly issue, demonstrating how the weekly/series feature works. Ideal for publishing regularly updated serial content.
tags:
  - Weekly
categories:
  - Weekly
---

This is an example weekly issue, demonstrating how the weekly/series feature works.

## About the Weekly Feature

The weekly feature is one of astro-koharu's signature capabilities, ideal for publishing regularly updated serial content such as:

- Tech newsletters
- Reading notes series
- Learning journals
- Project progress updates

## Weekly Configuration

You can find the configuration in your `config.yaml`:

```yaml
featuredSeries:
  - slug: weekly 
    categoryName: Weekly      # Must match the category name in your post
    label: My Weekly          # Display label in navigation
    fullName: My Tech Weekly
    description: Weekly description...
    cover: /img/weekly_header.webp
    enabled: true            # Set false to disable