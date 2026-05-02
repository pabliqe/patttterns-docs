---
title: Analytics
nav_order: 4
---

# Event Tracking Setup Guide

## Overview

I've implemented a centralized event tracking system for your Patterns Next application, with full Google Analytics 4 (GA4) integration. The system tracks user interactions across your site and sends data to GA4.

## ✅ Google Analytics 4 Setup Complete

The GA4 tracking is now fully configured with **double-layer protection against dev/local execution**:

1. **Environment Variable**: Set `NEXT_PUBLIC_GA_ID` in your `.env.local` file
2. **Script Loading**: GA4 script **only loads in production** (`NODE_ENV === 'production'`)
3. **Event Tracking**: Additional runtime check blocks events on localhost/127.0.0.1/*.local
4. **TypeScript Support**: Full type definitions for gtag included

### Development Safety

✅ **GA script will NOT load in development** - The script tag is conditionally rendered only when `NODE_ENV === 'production'`

✅ **Events are blocked in dev** - Even if script somehow loads, the analytics module detects localhost and blocks all events

✅ **Console logging enabled** - See all events in browser console during development

### Quick Start

1. Create a `.env.local` file (use `.env.local.example` as template):
   ```bash
   NEXT_PUBLIC_GA_ID=G-K1F96PRZNS
   ```

2. Start your development server:
   ```bash
   npm run dev
   ```

3. Events will now be sent to Google Analytics 4 in production environments

## Events Tracked

### 1. **Bookmark Open** 
- **Event Name**: `bookmark_drawer_open`
- **Category**: engagement
- **Triggered**: When user opens the bookmark drawer
- **Location**: [src/components/BookmarkDrawer.tsx](src/components/BookmarkDrawer.tsx)

### 2. **Bookmark Item Click**
- **Event Name**: `bookmark_item_click`
- **Category**: engagement
- **Triggered**: When user clicks a saved pattern in the bookmark drawer
- **Metadata**: pageId, pageTitle, slug
- **Location**: [src/components/BookmarkDrawer.tsx](src/components/BookmarkDrawer.tsx)

### 3. **Saved Pattern from Footer**
- **Event Name**: `save_pattern_from_footer`
- **Category**: conversion
- **Triggered**: When user clicks "Save this pattern" button at bottom of detail pages
- **Metadata**: pageId, pageTitle
- **Location**: [src/components/NotionPageRenderer.tsx](src/components/NotionPageRenderer.tsx)

### 4. **Saved Pattern from Card Thumbnail**
- **Event Name**: `save_pattern_from_card`
- **Category**: conversion
- **Triggered**: When user clicks bookmark button on collection card
- **Metadata**: pageId, pageTitle, device (desktop/tablet/phone)
- **Location**: [src/components/CollectionCard.tsx](src/components/CollectionCard.tsx)

### 5. **Image Clicked / Zoom Opened**
- **Event Name**: `image_clicked`
- **Category**: engagement
- **Triggered**: When user clicks on any image in a detail page
- **Metadata**: imageUrl (sanitized), pageTitle
- **Location**: [src/components/NotionPageRenderer.tsx](src/components/NotionPageRenderer.tsx)

## File Structure

```
.env.local.example            # Environment variable template
src/
├── types/
│   └── gtag.d.ts            # TypeScript definitions for GA4
├── lib/
│   └── analytics.ts         # Core analytics module with GA4 integration
├── app/
│   └── layout.tsx           # GA4 script injection
└── components/
    ├── BookmarkButton.tsx   # Updated with tracking
    ├── BookmarkDrawer.tsx   # Updated with tracking
    ├── CollectionCard.tsx   # Updated with tracking
    └── NotionPageRenderer.tsx # Updated with tracking
```

## Implementation Details

### Analytics Module (`src/lib/analytics.ts`)

The analytics module provides:

- **`analytics.trackEvent(event)`** - Generic event tracking
- **`analytics.trackBookmarkDrawerOpen()`** - Bookmark drawer open
- **`analytics.trackBookmarkItemClick(pageTitle, pageId, slug)`** - Bookmark item click
- **`analytics.trackSavePatternFromFooter(pageTitle, pageId)`** - Footer save
- **`analytics.trackSavePatternFromCard(pageTitle, pageId, device)`** - Card save
- **`analytics.trackImageClicked(imageUrl, pageTitle)`** - Image click
- **`analytics.trackRemoveBookmark(pageTitle, pageId)`** - Bookmark removal

### Configuration

To configure analytics, update the analytics instance in your app:

```typescript
import { analytics } from "@/lib/analytics";

// Enable/disable console logging (default: true)
analytics.configure({
  enableLogging: process.env.NODE_ENV === "development",
  
  // Google Analytics ID (optional)
  googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID,
  
  // Custom tracking endpoint (optional)
  customEndpoint: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT,
});
```

## Integration with Google Analytics

✅ **Already Configured!** The GA4 integration is complete and ready to use.

**What's been set up:**
- GA4 script loads **only in production** (`NODE_ENV === 'production'`) - [src/app/layout.tsx](src/app/layout.tsx#L167)
- Uses `NEXT_PUBLIC_GA_ID` environment variable
- TypeScript types for gtag in [src/types/gtag.d.ts](src/types/gtag.d.ts)
- GA4-compatible event parameter names
- Runtime protection: auto-disabled on localhost/127.0.0.1/*.local hostnames - [src/lib/analytics.ts](src/lib/analytics.ts#L36-L46)

**To activate:**
1. Set `NEXT_PUBLIC_GA_ID=G-K1F96PRZNS` in `.env.local`
2. Deploy or restart your dev server
3. Events will automatically flow to GA4

**Viewing Events in GA4:**
- Go to your GA4 property → Reports → Realtime
- Events will appear as they're triggered
- Custom parameters (event_category, event_label, etc.) are included

## Integration with Custom Backend

To send events to a custom tracking endpoint:

1. **Set environment variable**:
```bash
NEXT_PUBLIC_ANALYTICS_ENDPOINT=https://your-api.com/analytics
```

2. **Configure analytics**:
```typescript
analytics.configure({
  customEndpoint: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT,
});
```

## Event Data Structure

Each event contains:

```typescript
{
  eventName: string;           // e.g., "save_pattern_from_footer"
  eventCategory?: string;      // e.g., "conversion"
  eventLabel?: string;         // e.g., page title
  eventValue?: number;         // numeric value (optional)
  metadata?: Record<string, any>; // additional context
  timestamp?: number;          // auto-added
}
```

## Console Output (Development)

In development mode, all events are logged to console:

```
[Analytics Event] {
  eventName: 'save_pattern_from_footer',
  eventCategory: 'conversion',
  eventLabel: 'Grid Pattern',
  timestamp: 1706729400000,
  metadata: {
    action: 'save',
    source: 'footer',
    pageId: 'abc123',
    pageTitle: 'Grid Pattern',
    component: 'NotionPageRenderer'
  }
}
```

## Testing Events

### Development Environment
1. **Console Logging**: Events are logged to browser console in development:
   ```
   [Analytics Event] ⊘ (disabled on dev) {
     eventName: 'save_pattern_from_footer',
     eventCategory: 'conversion',
     eventLabel: 'Grid Pattern',
     timestamp: 1706729400000,
     metadata: {...}
   }
   ```

2. **Force Enable Tracking**: To test GA4 in localhost, modify [src/lib/analytics.ts](src/lib/analytics.ts):
   ```typescript
   enableTracking: true  // Force enable for testing
   ```

### Production Environment
1. **Google Analytics Real-time**: 
   - Open GA4 → Reports → Realtime → Events
   - Perform actions on your site
   - See events appear in real-time

2. **Browser DevTools**:
   - Open Network tab
   - Filter by "collect" or "gtag"
   - See GA4 requests being sent

3. **GA4 DebugView** (Recommended):
   - Install [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger/) extension
   - Enable it and refresh your site
   - View in GA4 → Configure → DebugView

## Extending Analytics

To add new events, add methods to the `Analytics` class in [src/lib/analytics.ts](src/lib/analytics.ts):

```typescript
trackCustomEvent(params: string): void {
  this.trackEvent({
    eventName: "custom_event",
    eventCategory: "engagement",
    eventLabel: params,
    metadata: {
      // your metadata
    },
  });
}
```

Then import and use in components:

```typescript
import { analytics } from "@/lib/analytics";

analytics.trackCustomEvent("value");
```

## Privacy & Security

- Image URLs are sanitized before sending to avoid exposing sensitive data
- Only up to 50 characters of URLs are logged
- No personally identifiable information is captured
- Events can be disabled by setting `enableLogging: false`

## Notes

- All tracking is **asynchronous** and won't block user interactions
- Events are logged **before** state changes to ensure accurate data
- The tracking system is **framework-agnostic** and can be used anywhere in your app
- Console logging helps with development and debugging
