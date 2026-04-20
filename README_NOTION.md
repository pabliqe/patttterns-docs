# Patttterns - Notion-Powered Website

A modern Next.js website powered by Notion as your database. No more Super.so fees!

## Features

- ✅ Fetch data from Notion databases
- ✅ Server-side rendering with Next.js
- ✅ Tailwind CSS + shadecn/ui components
- ✅ Free hosting on Netlify + GitHub
- ✅ Automatic builds on Notion updates

## Setup

### 1. Create Notion Integration

1. Go to [Notion Integrations](https://www.notion.com/my-integrations)
2. Click "Create new integration"
3. Name it "Patttterns"
4. Copy the **Internal Integration Token**
5. Go to your database → Share → Select your integration
6. Copy the **Database ID** from the URL

### 2. Environment Variables

Create `.env.local`:

```bash
NOTION_API_KEY=your_token_here
NOTION_HOMEPAGE_ID=your_database_id_here
```

### 3. Run Locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Deployment to Netlify

1. Push to GitHub
2. Connect repo to Netlify
3. Add environment variables in Netlify settings
4. Deploy!

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── page.tsx        # Home page
│   └── layout.tsx      # Root layout
├── lib/
│   └── notion.ts       # Notion API client
└── components/
    └── NotionPageGrid.tsx  # Display Notion data
```

## API Reference

### `getNotionDatabase(databaseId)`

Fetches all pages from a Notion database.

```typescript
import { getNotionDatabase } from "@/lib/notion";

const pages = await getNotionDatabase("your-database-id");
```

## Customization

Edit `src/components/NotionPageGrid.tsx` to customize the UI:

- Change grid layout
- Add more property displays
- Style with Tailwind

## Next Steps

- [ ] Add filtering/search
- [ ] Create single page view
- [ ] Add image galleries
- [ ] Deploy to Netlify

## License

MIT
