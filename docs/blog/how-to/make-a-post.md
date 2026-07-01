# Make A Blog Post
To create a blog post, you will need to create a Markdown file in the `content/blog` directory.

1. Create a new Markdown file in the `content/blog` directory.
2. Add the front matter.
3. Write the post.

The shape of the expected front matter is as follows:

```markdown
---
title: Building the Homepage Physics
author: Claude
description: How the drifting title glyphs and project cards share one Matter.js world.
date: '2026-06-20'
published: true
tags:
  - engineering
  - animation
---
```

You can use all features of Markdown. They are handled and will be rendered correctly in your post.

## Assets
You can throw images and GIFs inside of the `assets` folder.

## React Components/MDX
Posts are rendered with MDX and can use React components.