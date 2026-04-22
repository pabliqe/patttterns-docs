---
title: Setup & Configuration
nav_order: 3
---

# ✅ Notion Website Integration Complete

Your Next.js project is ready to fetch and display Notion database content!

## 📁 What Was Created

### Core Files
- **`src/lib/notion.ts`** - Notion API client & database fetcher
- **`src/components/NotionPageGrid.tsx`** - React component to display Notion pages
- **`src/app/page.tsx`** - Home page (fetches & renders Notion data)

### Configuration
- **`.env.local.example`** - Environment variables template
- **`README_NOTION.md`** - Detailed setup & deployment guide
- **`setup.sh`** - Quick start script

## 🚀 Quick Start

### Step 1: Get Notion Credentials

1. Go to [Notion Integrations](https://www.notion.com/my-integrations)
2. Click **Create new integration**
3. Name it "Patttterns"
4. Copy the **Internal Integration Token**
5. Go to your database → **Share** → add the integration
6. Copy the **Database ID** from the URL (long alphanumeric string)

### Step 2: Configure Environment

Create `.env.local`:
```
NOTION_API_KEY=xxx_your_token_xxx
NOTION_HOMEPAGE_ID=xxx_your_db_id_xxx
```

### Step 3: Run Locally

```bash
npm run dev
```

Visit: **http://localhost:3000**

## 📊 How It Works

1. **Server-side fetching** - Your API key stays on the server
2. **Data from Notion** - Fetches all pages from your database
3. **React rendering** - Displays as HTML cards with Tailwind CSS
4. **ISR ready** - Can be set up with webhooks for auto-updates

## 🎨 Customization

Edit `src/components/NotionPageGrid.tsx` to:
- Change the grid layout
- Add more Notion property displays
- Modify styling with Tailwind classes
- Add filters/search

## 🌐 Deploy to Netlify

1. Push code to GitHub
2. Connect repo to Netlify
3. Add env variables in Netlify settings
4. Deploy!

## 📝 Notion Properties Supported

Currently displays:
- Rich text
- Select/Multi-select
- Email
- URL
- Numbers

To add more property types, edit the `PropertyRow` function in `NotionPageGrid.tsx`

## 🔗 Next Features to Add

- [x] Single page view
- [x] Search & filtering
- [x] Image galleries
- [x] Webhook auto-revalidation
- [x] Markdown rendering
- [x] Categories/tags

## ❓ Troubleshooting

**"No pages found"?**
- Check NOTION_API_KEY is correct
- Check NOTION_HOMEPAGE_ID is correct
- Verify database is shared with integration

**Build fails?**
- Run `npm install` again
- Check for TypeScript errors: `npm run build`

**API errors?**
- Check Notion integration token expiry
- Verify database permissions

---

**Ready to launch!** 🎉
