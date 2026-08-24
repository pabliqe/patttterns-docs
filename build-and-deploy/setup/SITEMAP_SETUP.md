---
title: Sitemap & SEO Configuration
parent: Setup & Configuration
---

# Sitemap & SEO Configuration

## Overview

Your Next.js application now generates a dynamic XML sitemap automatically during the build process, which is essential for Google Search Console and other search engines.

## What's Generated

### **Sitemap.xml**
- **Location**: `https://patttterns.com/sitemap.xml`
- **Auto-generated**: Yes, during `npm run build`
- **Includes**:
  - Homepage (priority: 1.0, weekly updates)
  - All pattern pages from Notion database (priority: 0.8, monthly updates)
  - Last modified timestamps

### **Robots.txt**
- **Location**: `https://patttterns.com/robots.txt`
- **Purpose**: Instructs search engines about sitemap location and crawling rules
- **Current settings**: Allows all bots except `/library`, `/debug`, and a few assets; points at both sitemaps

### **Sitemap-libraries.xml**
- **Location**: `https://patttterns.com/sitemap-libraries.xml`
- **Generated**: Runtime Netlify Function (`sitemap-libraries`), not the Next build
- **Includes**: every `share_enabled` library as `https://patttterns.com/l/{share_token}`
- **Why a Function:** libraries change without a content rebuild (same idea as not regenerating TSX on every save)

## Files Created

1. **[src/app/sitemap.ts](src/app/sitemap.ts)** - Dynamic sitemap generator
2. **[public/robots.txt](public/robots.txt)** - Robots directives

## How It Works

### Automatic Generation
```typescript
// src/app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetches all pages from Notion database
  // Generates sitemap entry for each pattern
  // Returns XML that Next.js automatically formats
}
```

The sitemap is:
- ✅ Generated at build time
- ✅ Served at `/sitemap.xml`
- ✅ Automatically formatted as valid XML by Next.js
- ✅ Includes all dynamic routes with proper priorities

## Setup in Google Search Console

1. **Go to**: [Google Search Console](https://search.google.com/search-console)
2. **Select your domain**: `patttterns.net`
3. **Navigate to**: Sitemaps (left sidebar)
4. **Add new sitemap**: `https://patttterns.com/sitemap.xml`
5. **Submit**: Google will crawl and index your patterns

## Sitemap Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://patttterns.com</loc>
    <lastmod>2026-01-31</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://patttterns.com/grid-pattern-abc123</loc>
    <lastmod>2026-01-31</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- ... more pattern pages ... -->
</urlset>
```

## Priority Settings

| Page | Priority | Change Frequency | Rationale |
|------|----------|------------------|-----------|
| Homepage | 1.0 | Weekly | Entry point for all content |
| Pattern Pages | 0.8 | Monthly | Content doesn't change frequently |

## Verification

### Local Development
```bash
# Build the project
npm run build

# The sitemap is automatically generated at .next/server/app/sitemap.xml
```

### Production
```bash
# After deployment, verify sitemap is accessible
curl https://patttterns.com/sitemap.xml
# Should return valid XML with all your patterns

curl https://patttterns.com/sitemap-libraries.xml
# Should return a urlset of https://patttterns.com/l/{uuid} entries
```

Google Search Console: also submit `https://patttterns.com/sitemap-libraries.xml`.

## Dynamic Updates

The pattern sitemap is **regenerated on each build**:
- ✅ New patterns automatically included
- ✅ Removed patterns automatically excluded
- ✅ Last modified dates updated
- ⚠️ Requires new deployment for pattern URL changes to be live

Public libraries are **not** in that build sitemap. `/sitemap-libraries.xml` is a Function that reads live `share_enabled` profiles (CDN-cached ~10 minutes).

## Additional SEO Features

### Robots.txt
Accessible at `https://patttterns.com/robots.txt` and includes:
- Allow `/` and `/l/`
- `Disallow: /library` (owner SPA, not canonical)
- `Sitemap: https://patttterns.com/sitemap.xml`
- `Sitemap: https://patttterns.com/sitemap-libraries.xml`

### Meta Tags (Already Configured)
In `src/app/layout.tsx`:
- Title tags
- Meta descriptions
- Open Graph images
- Twitter cards

## Troubleshooting

### Sitemap shows 0 URLs
- ✅ Check `NOTION_HOMEPAGE_ID` is set in `.env.local`
- ✅ Verify Notion API key has access to database
- ✅ Check console output during build for errors

### Google Search Console reports errors
- ✅ Verify all URLs in sitemap are accessible
- ✅ Check that pages return 200 status codes
- ✅ Ensure trailing slashes are consistent

## Next Steps

1. **Submit to Google Search Console** (see setup steps above)
2. **Monitor coverage** in Google Search Console
3. **Check indexing status** for your patterns
4. **Review search queries** to optimize content
5. **Track impressions & clicks** over time

## Resources

- [Next.js Sitemap Docs](https://nextjs.org/docs/app/api-reference/file-conventions/sitemap)
- [Google Search Console Help](https://support.google.com/webmasters/answer/6062598)
- [Sitemap Protocol Reference](https://www.sitemaps.org/)