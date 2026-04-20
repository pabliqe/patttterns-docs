# Event Tracking Quick Reference

## Events Summary

### Bookmarks

| Event | Trigger | Category | Source |
|-------|---------|----------|--------|
| `bookmark_drawer_open` | Open bookmark drawer | engagement | BookmarkDrawer |
| `save_pattern` | Bookmark saved (total count snapshot) | engagement | BookmarkSystem |
| `save_pattern_from_footer` | Click save button at page bottom | conversion | NotionPageRenderer |
| `save_pattern_from_header` | Click save button in page header | conversion | PatternHeader |
| `save_pattern_from_card` | Click bookmark icon on collection card | conversion | CollectionCard |
| `save_pattern_from_search` | Click bookmark from search results | conversion | SearchBar |
| `remove_bookmark` | Remove a single bookmark from drawer | engagement | BookmarkDrawer |
| `clear_all_bookmarks` | Clear all bookmarks at once | engagement | BookmarkDrawer |
| `bookmark_item_click` | Navigate to a pattern from the drawer | engagement | BookmarkDrawer |

### Images

| Event | Trigger | Category | Source |
|-------|---------|----------|--------|
| `image_clicked` | Click image on detail page | engagement | NotionPageRenderer |
| `image_zoom_opened` | Open image lightbox/zoom | engagement | NotionPageRenderer |

### Search

| Event | Trigger | Category | Source |
|-------|---------|----------|--------|
| `search_submit` | Submit a search query | engagement | SearchBar |
| `search_result_click` | Click a result in search results | conversion | SearchBar |

### Navigation

| Event | Trigger | Category | Source |
|-------|---------|----------|--------|
| `random_pattern_click` | Click random pattern button | engagement | RandomPatternButton |

### Library

| Event | Trigger | Category | Source |
|-------|---------|----------|--------|
| `library_opened_from_profile` | Click "Go to Library" in profile dropdown | navigation | AuthButton |
| `library_opened_from_drawer` | Click "Go to Library" in bookmark drawer | navigation | BookmarkDrawer |
| `library_public_view` | Visitor opens a shared library (read-only) | engagement | LibraryFlowView |
| `library_context_saved` | Owner saves AI library context description | engagement | LibraryFlowView |
| `library_title_saved` | Owner saves library title | engagement | LibraryFlowView |
| `library_copy_link` | Owner copies the public share link | engagement | LibraryShareButton |
| `library_reset_link` | Owner regenerates the public share link | engagement | LibraryShareButton |
| `library_share_changed` | Enable / disable / regenerate share token | engagement | LibraryShareButton |

### Auth / OAuth

| Event | Trigger | Category | Source |
|-------|---------|----------|--------|
| `login_modal_presented` | Login modal shown to user (with trigger reason) | conversion | LoginModal |
| `sign_in_started` | User clicks a sign-in button (Google) | conversion | LoginModal / AuthButton |
| `sign_in_completed` | Session transitions to authenticated (OAuth callback) | conversion | useUserSync |

Add to your layout or analytics config initialization:
```typescript
import { analytics } from "@/lib/analytics";

analytics.configure({
  googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID,
  enableLogging: process.env.NODE_ENV === "development",
});
```

### 2. Track Custom Events

```typescript
import { analytics } from "@/lib/analytics";

analytics.trackEvent({
  eventName: "custom_event",
  eventCategory: "engagement",
  eventLabel: "My Label",
  eventValue: 100,
  metadata: {
    customField: "value"
  }
});
```

### 3. Verify in Development

Open DevTools → Console and perform actions. You'll see:
```
[Analytics Event] { eventName: '...', eventCategory: '...', ... }
```

## Event Metadata Examples

### Save Pattern from Footer
```json
{
  "action": "save",
  "source": "footer",
  "pageId": "123abc",
  "pageTitle": "Grid Pattern",
  "component": "NotionPageRenderer"
}
```

### Save Pattern from Card
```json
{
  "action": "save",
  "source": "card_thumbnail",
  "pageId": "123abc",
  "pageTitle": "Grid Pattern",
  "device": "desktop",
  "component": "CollectionCard"
}
```

### Image Click
```json
{
  "action": "click",
  "imageUrl": "https://example.com/image/path/...",
  "pageTitle": "Grid Pattern"
}
```

## Analytics Instance Methods

```typescript
// ─── Bookmarks ────────────────────────────────────────────────────────────────

// Open bookmark drawer
analytics.trackBookmarkDrawerOpen()

// Total saves snapshot (engagement / histogram)
analytics.trackUserTotalSaves(totalSaves)

// Save from footer (detail page)
analytics.trackSavePatternFromFooter(pageTitle, pageId, totalSaves)

// Save from page header
analytics.trackSavePatternFromHeader(pageTitle, pageId, totalSaves)

// Save from card (collection page)
analytics.trackSavePatternFromCard(pageTitle, pageId, totalSaves, device?)

// Save from search results
analytics.trackSavePatternFromSearch(pageTitle, pageId, totalSaves)

// Remove single bookmark
analytics.trackRemoveBookmark(pageTitle, pageId)

// Clear all bookmarks
analytics.trackClearAllBookmarks(count)

// Navigate to pattern from drawer
analytics.trackBookmarkItemClick(pageTitle, pageId, slug)

// ─── Images ───────────────────────────────────────────────────────────────────

// Image click
analytics.trackImageClicked(imageUrl, pageTitle?)

// Image lightbox/zoom opened
analytics.trackImageZoomOpen(imageUrl, pageTitle?)

// ─── Search ───────────────────────────────────────────────────────────────────

// Search query submitted
analytics.trackSearchSubmit(query, resultCount)

// Search result clicked
analytics.trackSearchResultClick(resultTitle, resultType, query)

// ─── Navigation ───────────────────────────────────────────────────────────────

// Random pattern button clicked
analytics.trackRandomPatternClick(source)

// ─── Library ─────────────────────────────────────────────────────────────────

// Navigate to /library from profile dropdown
analytics.trackLibraryOpenedFromProfile()

// Navigate to /library from bookmark drawer
analytics.trackLibraryOpenedFromDrawer()

// Public (read-only) library visit via share token
analytics.trackLibraryPublicView(ownerName?)

// AI context description saved by owner
analytics.trackLibraryContextSaved(charCount)

// Library title saved by owner
analytics.trackLibraryTitleSaved(charCount)

// Owner copies the public share link
analytics.trackLibraryCopyLink()

// Owner regenerates the public share link
analytics.trackLibraryResetLink()

// Library sharing status changed
analytics.trackLibraryShareChanged("enable" | "disable" | "regenerate" | "toggle-author")

// ─── Auth / OAuth ─────────────────────────────────────────────────────────────

// Login modal shown (reason captured in trigger)
analytics.trackLoginModalPresented(trigger)

// Sign-in button clicked (OAuth flow started)
analytics.trackSignInStarted(provider, uiSource)

// Session transition: unauthenticated → authenticated
analytics.trackSignInCompleted(provider)

// ─── Custom ───────────────────────────────────────────────────────────────────

// Custom event
analytics.trackEvent(event)

// Configure settings
analytics.configure({ enableLogging, googleAnalyticsId, customEndpoint })
```

## Testing Without GA

Events will still log to console in development even without Google Analytics configured. Set `enableLogging: true` to see them.

## Custom Endpoint Format

Your backend should accept POST requests with this structure:
```json
{
  "eventName": "string",
  "eventCategory": "string",
  "eventLabel": "string",
  "eventValue": number,
  "metadata": {},
  "timestamp": number
}
```
