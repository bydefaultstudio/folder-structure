---
title: "SEO"
subtitle: "SEO meta tags and social sharing guidelines"
description: "Complete guide to SEO meta tags, Open Graph, X Cards, and structured data."
section: "Content"
order: 9
---

This document outlines SEO best practices for HTML pages, including meta tags, Open Graph, X (Twitter) Cards, and structured data.



## Essential Meta Tags

### Required Tags

Every page must include these essential meta tags:

```html
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Page Title - Site Name</title>
<meta name="description" content="A concise, compelling description of the page (150-160 characters)." />
```

**Best Practices:**

- **Title:** 50-60 characters, include primary keyword, unique per page
- **Description:** 150-160 characters, compelling, include call-to-action
- **Viewport:** Required for responsive design and mobile SEO

---

## Page Title

The `<title>` tag is one of the most important SEO elements.

**Guidelines:**

- Keep between 50-60 characters
- Include primary keyword near the beginning
- Make it unique for each page
- Include brand/site name (usually at the end)
- Write for humans, not just search engines

**Examples:**

```html
<!-- Good -->
<title>By Default - Brand Innovation Studio</title>
<title>About Us - By Default</title>

<!-- Too long (will be truncated) -->
<title>Comprehensive Guide to Modern Web Design and Development Services - Creative Studio</title>
```

---

## Meta Description

The meta description appears in search results and can influence click-through rates.

**Guidelines:**

- Keep between 150-160 characters
- Write compelling, action-oriented copy
- Include primary keyword naturally
- Make it unique for each page
- Include a call-to-action when appropriate

**Examples:**

```html
<!-- Good -->
<meta name="description" content="Professional web design services for modern businesses. Custom solutions that drive results. Get started today." />

<!-- Too long (will be truncated) -->
<meta name="description" content="We offer comprehensive web design services including custom development, responsive design, e-commerce solutions, content management systems, and ongoing support for businesses of all sizes." />
```

---

## Canonical URL

Prevents duplicate content issues by specifying the preferred version of a page.

```html
<link rel="canonical" href="https://yoursite.com/page/" />
```

**When to use:**

- Always include on every page
- Use absolute URLs (full URL with https://)
- Point to the primary version of the page
- Essential for pages with query parameters or multiple URLs

---

## Robots Meta Tag

Controls how search engines index and follow links on a page.

```html
<!-- Default: allow indexing -->
<meta name="robots" content="index, follow" />

<!-- Prevent indexing -->
<meta name="robots" content="noindex, nofollow" />

<!-- Allow indexing but don't follow links -->
<meta name="robots" content="index, nofollow" />
```

**Common values:**

- `index, follow` - Default, allow indexing and following links
- `noindex, nofollow` - Don't index or follow links (for private/admin pages)
- `index, nofollow` - Index page but don't follow links
- `noindex, follow` - Don't index but follow links

---

## Open Graph Tags

Open Graph tags control how content appears when shared on Facebook, LinkedIn, and other social platforms.

**Where to save images:**
- Save Open Graph images in `assets/images/`
- Use descriptive filenames (e.g., `og-default.jpg`, `og-homepage.jpg`)

### Required Open Graph Tags

```html
<meta property="og:type" content="website" />
<meta property="og:url" content="https://yoursite.com/page/" />
<meta property="og:title" content="Page Title - Site Name" />
<meta property="og:description" content="A concise, compelling description of the page." />
<meta property="og:image" content="https://yoursite.com/assets/images/og-default.jpg" />
```

### Recommended Additional Tags

```html
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Descriptive alt text for the image" />
<meta property="og:site_name" content="Site Name" />
<meta property="og:locale" content="en_US" />
```

**Best Practices:**

- **Image:** 1200x630px (1.91:1 ratio), JPG or PNG, under 1MB
- **URL:** Absolute URL to the page
- **Type:** `website` for pages, `article` for blog posts
- **Title/Description:** Can differ from meta title/description (optimize for social sharing)

**Image Requirements:**

- Dimensions: 1200x630px (recommended)
- Format: JPG or PNG
- File size: Under 1MB
- Content: Should represent the page visually
- Alt text: Descriptive and accessible

---

## X (Twitter) Card Tags

X Cards (formerly Twitter Cards) control how content appears when shared on X (formerly Twitter).

### Summary Large Image Card

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://yoursite.com/page/" />
<meta name="twitter:title" content="Page Title - Site Name" />
<meta name="twitter:description" content="A concise, compelling description of the page." />
<meta name="twitter:image" content="https://yoursite.com/assets/images/og-default.jpg" />
<meta name="twitter:image:alt" content="Descriptive alt text for the image" />
```

### Optional X Tags

```html
<meta name="twitter:site" content="@yourhandle" />
<meta name="twitter:creator" content="@yourhandle" />
```

**Card Types:**

- `summary_large_image` - Large image card (1200x628px recommended)
- `summary` - Small image card (120x120px minimum)

**Best Practices:**

- Use `summary_large_image` for better engagement
- Image: 1200x628px for large image cards
- Include alt text for accessibility

---

## Theme Color

Sets the theme color for mobile browsers (address bar, etc.).

```html
<meta name="theme-color" content="#3485cd" />
```

Use your brand's primary color. This should match your design system's brand accent color.

---

## Structured Data (JSON-LD)

Structured data helps search engines understand your content and can enable rich results.

### Basic WebPage Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Page Title",
  "description": "Page description",
  "url": "https://yoursite.com/page/",
  "inLanguage": "en-US"
}
</script>
```

### Organization Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Site Name",
  "url": "https://yoursite.com",
  "logo": "https://yoursite.com/assets/images/logo.png"
}
</script>
```

**Best Practices:**

- Use JSON-LD format (recommended by Google)
- Place in `<head>` or before closing `</body>`
- Validate using [Google's Rich Results Test](https://search.google.com/test/rich-results)
- Only include relevant schema types

---

## Quick Checklist

Before publishing a page, ensure:

- [ ] Unique `<title>` per page (50-60 characters)
- [ ] Unique `<meta name="description">` per page (150-160 characters)
- [ ] `<meta name="viewport">` for responsive design
- [ ] Open Graph tags for social sharing
- [ ] X (Twitter) Card tags
- [ ] Canonical URL to prevent duplicate content
- [ ] Favicons (already in template)
- [ ] Theme color for mobile browsers
- [ ] Structured data (JSON-LD) for rich results (optional but recommended)

---

## Image Requirements Summary

| Platform | Dimensions | Format | Max Size |
| --- | --- | --- | --- |
| Open Graph | 1200x630px | JPG/PNG | 1MB |
| X Card (Large) | 1200x628px | JPG/PNG | 1MB |
| X Card (Summary) | 120x120px min | JPG/PNG | 1MB |

**Always include descriptive alt text for all images.**

---

## Testing Your SEO Tags

### Tools for Testing

1. **Google Rich Results Test**
   - URL: https://search.google.com/test/rich-results
   - Tests structured data and rich results

2. **Facebook Sharing Debugger**
   - URL: https://developers.facebook.com/tools/debug/
   - Tests Open Graph tags and clears Facebook cache

3. **X Card Validator**
   - URL: https://cards-dev.twitter.com/validator
   - Tests X (Twitter) Card tags

4. **Google Search Console**
   - Monitor how your pages appear in search results
   - Check for indexing issues

---

## Common Mistakes to Avoid

1. **Duplicate titles/descriptions** - Every page should be unique
2. **Missing viewport tag** - Required for mobile SEO
3. **Relative URLs in Open Graph** - Always use absolute URLs
4. **Missing image alt text** - Required for accessibility and SEO
5. **Oversized images** - Keep under 1MB for fast loading
6. **Missing canonical URL** - Can cause duplicate content issues
7. **Generic descriptions** - Write compelling, specific copy

---

## Additional Resources

- [Google Search Central](https://developers.google.com/search)
- [Open Graph Protocol](https://ogp.me/)
- [X Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards) (formerly Twitter Cards)
- [Schema.org](https://schema.org/)

