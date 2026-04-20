# ROADMAP — Multi-Library & AI Optimization

## Context

PATTTTERNS soporta una biblioteca por usuario con título editable, share token propio y campo de contexto AI (descripción). La arquitectura actual usa **Supabase REST directo** desde el cliente — no Prisma ni Next API routes. Los datos de biblioteca viven en la tabla `user_profiles` de Supabase con RLS.

Estate actual (Abril 2026):
- Título editable (`library_title`) ✅
- Descripción / contexto AI (`library_description`) ✅
- Share token + toggle público/privado ✅
- Show/hide author en vista pública ✅
- Una única biblioteca por usuario (multi-library pendiente)

Constraints going in:
- Patterns may belong to **one or many** libraries simultaneously (many-to-many).
- Pricing / plan gating is **not** in scope for this roadmap — focus is on shipping the first great library experience.
- Token-based share URLs are acceptable today; SEO-friendly slug URLs are a future phase.
- The current single library must continue working transparently throughout the migration.

---

## Goals

- Editable library title on the same inline-edit pattern used by description.
- Library context (description) actively feeds LLM/AI features.
- Multiple libraries per user with clean data model.
- Patterns assignable to multiple libraries (many-to-many).
- AI features that create real user value: code export, auto-fill, build-from-patterns.

## Non-Goals (this roadmap)

- Pricing tiers or `isPro` enforcement.
- Public indexed library pages / SEO slug URLs (tracked separately).
- Full CMS or Notion-replacement for patterns.

---

## Data Model — Estado actual

> **Nota:** La migración a Prisma del ADR original fue descartada. La arquitectura usa Supabase REST + RLS directamente desde el cliente.

### Tabla actual: `user_profiles` (Supabase)

```typescript
type LibraryProfile = {
  user_id: string;            // FK → auth.users
  library_title: string | null;
  library_description: string | null;  // AI context
  share_token: string | null;
  share_enabled: boolean;
  public_display_name: string | null;
  public_avatar_url: string | null;
  public_show_author: boolean;
};
```

### Tabla actual: `user_bookmarks` (Supabase)

```sql
user_bookmarks (
  user_id     uuid  REFERENCES auth.users,
  pattern_id  text,
  title       text,
  slug        text,
  cover       text,
  tags        text[],
  sort_order  int,
  created_at  timestamptz,
  PRIMARY KEY (user_id, pattern_id)  -- un bookmark por patrón por usuario
)
```

### Target schema para multi-library (Phase 2)

```sql
-- Nueva tabla para múltiples bibliotecas por usuario
libraries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users ON DELETE CASCADE,
  title        text NOT NULL DEFAULT 'My Pattern Library',
  description  text,           -- AI context prompt
  share_token  uuid UNIQUE DEFAULT gen_random_uuid(),
  share_enabled boolean DEFAULT false,
  is_default   boolean DEFAULT false,
  position     int DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (user_id, title)
);

-- Join table: un bookmark puede estar en varias bibliotecas
bookmark_on_library (
  bookmark_id  text,   -- user_bookmarks.pattern_id
  library_id   uuid REFERENCES libraries ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users ON DELETE CASCADE,  -- para RLS
  added_at     timestamptz DEFAULT now(),
  PRIMARY KEY (bookmark_id, library_id)
);
```

**Migración de datos:** Para cada usuario existente, crear una `Library` default y mover `user_profiles.(library_title, library_description, share_token, share_enabled)` a ella.

---

## Phased Roadmap

---

### Phase 1 — Editable Library Title ✅ *Completo*

**Implementado en:** `src/components/LibraryFlowView.tsx`, `src/lib/library-cloud.ts`

#### Qué se construyó

- [x] Campo `library_title` en `user_profiles` (Supabase).
- [x] `PATCH user_profiles` via `updateMyLibraryProfile({ library_title })` en `library-cloud.ts`.
- [x] Componente `TitleField` en `LibraryFlowView` — pencil icon + blur-to-save + Escape para cancelar.
  - Owner: editable con validación 0-60 chars + contador.
  - Visitor: read-only desde props.
- [x] `"My Pattern Library"` hardcoded reemplazado por prop-driven `title` (fallback al default).
- [x] `library_title` se pasa desde `library/page.tsx` vía `getMyLibraryProfile()`.
- [x] Vista pública lee `library_title` desde `getPublicProfile(token)`.
- [x] Analytics: `library_title_saved` trackeado en `analytics.ts`.

#### Exit criteria ✅

- [x] Owner puede renombrar su biblioteca sin page reload.
- [x] Visitors ven el título personalizado en la vista compartida.
- [x] Título persiste entre recargas.

---

### Phase 2 — Library Schema Migration 🔲 *Próximo*

**Priority: High — required before Phase 3 (AI) and Phase 5 (multi-library).**

> Migrar de `user_profiles.(library_title, share_token, ...)` a una tabla `libraries` dedicada. Esto desbloquea múltiples bibliotecas por usuario sin romper el flujo actual.

#### What to build

- [ ] **Crear tabla `libraries`** en Supabase con RLS (owner full access, public read cuando `share_enabled`).
- [ ] **Crear tabla `bookmark_on_library`** join table con RLS.
- [ ] **Script de migración:** para cada `user_profiles` existente, crear una fila `libraries` default con los datos actuales.
- [ ] **Actualizar `library-cloud.ts`:**
  - `getMyLibraryProfile()` → lee de `libraries` (default library del usuario).
  - `updateMyLibraryProfile()` → escribe en `libraries`.
  - `regenerateShareToken()` → escribe en `libraries`.
  - `getPublicProfile(token)` → busca en `libraries` por `share_token`.
  - `getPublicBookmarks(userId)` → join via `bookmark_on_library`.
- [ ] **Actualizar `bookmark-cloud.ts`:**
  - `upsertSupabaseBookmark()` → crea fila en `user_bookmarks` + fila en `bookmark_on_library` (default library).
  - `deleteSupabaseBookmark()` → borra de ambas tablas.
- [ ] **Share URL:** `/library?token=TOKEN` sin cambios (backward compatible).
- [ ] **Deprecar columnas en `user_profiles`** una vez migradas todas las lecturas.

#### Exit criteria

- [ ] Todos los usuarios existentes tienen exactamente una `Library` default con sus datos actuales.
- [ ] Sin degradación en flujos de bookmark y share.
- [ ] `user_profiles.library_title`, `.share_token`, `.share_enabled`, `.library_description` ya no se usan.

---

### Phase 3 — AI Context Integration (LLM Optimization)

**Priority: High — core differentiator.**

The library `description` field is the AI context prompt. It should feed at least two outputs:

#### 3a — Structured AI Context Object

- [ ] Create `lib/library-ai-context.ts`:
  ```ts
  export function buildLibraryContext(library: LibraryWithBookmarks): string {
    // Returns a grounded system-prompt string:
    // - Library title and curator name
    // - Library description (user-written intent)
    // - Top 10 tags across bookmarks (frequency-ranked)
    // - Up to 20 bookmark titles with their tags
  }
  ```
- [ ] Use this in every AI integration as the common grounding layer.

#### 3b — JSON-LD for Public Libraries

- [ ] On public library page (`/library?token=TOKEN`), inject `application/ld+json`:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "<library title>",
    "description": "<library description>",
    "author": { "@type": "Person", "name": "<owner name>" },
    "numberOfItems": 10,
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "<pattern title>", "url": "<pattern url>" }
    ]
  }
  ```
- [ ] This improves discoverability for public libraries and feeds AI crawlers.

#### 3c — Gemini Auto-fill Description

- [ ] `POST /api/library/ai/describe` — server-side only, never exposes API key to client.
  - Reads all bookmark titles + tags for the library.
  - Calls Gemini with a fixed system prompt asking for a 2-3 sentence curation description.
  - Returns `{ description: string }`.
- [ ] Add "Auto-fill with AI" button inside `DescriptionField` (owner only).
- [ ] User can accept, edit, or reject the suggestion before it saves.

#### Exit criteria

- [ ] Public library page has valid ItemList JSON-LD.
- [ ] Gemini auto-fill produces a coherent description from the actual bookmarks.
- [ ] `buildLibraryContext` is used as the single source of truth for all AI calls.

---

### Phase 4 — AI Features: Code Export & Build From Patterns

**Priority: Medium — high value, post-foundation.**

#### 4a — Code Export from Library

- [ ] `POST /api/library/ai/export-code` with `{ format: "tailwind" | "css-variables" | "figma-tokens" }`.
  - Grounded by `buildLibraryContext`.
  - Returns a code snippet: e.g. a Tailwind component scaffold using patterns in the library as reference.
- [ ] "Export as code" button in library header (owner only).
- [ ] Rendered in a modal with syntax-highlighted code and copy button.

#### 4b — Build From Patterns (Pattern Recommender)

- [ ] `POST /api/library/ai/recommend` — takes current library context and asks Gemini:
  *"Given this library of [N] patterns, what are the top 5 patterns from PATTTTERNS you'd recommend adding next, and why?"*
- [ ] Returns `[{ patternTitle, reason, searchQuery }]`.
- [ ] UI: "Suggest more patterns" CTA in the empty-state and below the grid.
- [ ] Each suggestion shows a reason and a link to search for that pattern.

#### 4c — Library Summary / README Generation

- [ ] `POST /api/library/ai/summarize` — generates a shareable markdown README for the library:
  - Title, description, curated patterns list, tags overview, intended use case.
- [ ] "Copy as README" button in share dropdown.
- [ ] Can be used for design system documentation, handoff, or pasting into Notion/Confluence.

#### Exit criteria

- [ ] Code export returns a useful scaffold from at least Tailwind and CSS variable formats.
- [ ] Recommender suggests patterns not already in the library with a rationale.
- [ ] Summary is coherent, < 500 words, copy-ready.

---

### Phase 5 — Multiple Libraries Per User

**Priority: Medium — after schema and AI foundations are stable.**

#### What to build

- [ ] `POST /api/libraries` — create a new library (title required).
- [ ] `GET /api/libraries` — list all libraries for the authenticated user (id, title, bookmark count, shareEnabled, updatedAt).
- [ ] `DELETE /api/libraries/[id]` — delete library; bookmarks remain if they belong to another library, otherwise ask user.
- [ ] Library switcher UI in the header (or as a `/library` index page showing all libraries as cards).
- [ ] "Add to library" in `BookmarkButton` / `BookmarkDrawer` shows a library picker (checkboxes for multi-assign).
- [ ] `BookmarkOnLibrary` join: a pattern's bookmark row is created once per user, assigned to N libraries via the join table.

#### URL strategy (current phase)

- Each library keeps a `shareToken` → public URL `/library?token=TOKEN` (unchanged).
- `/library` without token resolves to the user's default library.
- `/library?id=[id]` for owner switching between their own libraries.

#### SEO slug URLs (future, not in scope here)

- Future: `/[username]/[library-slug]` or `/l/[library-slug]` for public indexed pages.
- Track in a separate `ROADMAP_LIBRARY_SEO.md`.

#### Exit criteria

- [ ] User can create, rename, and delete additional libraries.
- [ ] Patterns can be simultaneously in multiple libraries.
- [ ] Default library continues to work without URL changes.
- [ ] Library switcher is accessible from `/library` without friction.

---

## API Contract Summary

> **Nota:** La implementación usa **Supabase REST directo** desde el cliente con RLS. No hay Next API routes para biblioteca. Los llamados a funciones en `library-cloud.ts` y `bookmark-cloud.ts` son el contrato real.

### Implementado (Phase 1 ✅)

| Función cliente | Tabla Supabase | Descripción |
|-----------------|---------------|-------------|
| `getMyLibraryProfile()` | `user_profiles` | Lee perfil + title + share state del owner |
| `updateMyLibraryProfile(patch)` | `user_profiles` | Actualiza title, description, share, author |
| `regenerateShareToken()` | `user_profiles` | Regenera share token |
| `getPublicProfile(token)` | `user_profiles` | Lee perfil público por share token |
| `getPublicBookmarks(userId)` | `user_bookmarks` | Lee bookmarks para vista pública |

### Pendiente (Phase 2 — tabla `libraries`)

| Función cliente (target) | Tabla Supabase | Descripción |
|--------------------------|---------------|-------------|
| `getMyLibraries()` | `libraries` | Lista todas las bibliotecas del usuario |
| `createLibrary(title)` | `libraries` | Crea nueva biblioteca |
| `getLibrary(id)` | `libraries` | Lee biblioteca por id |
| `updateLibrary(id, patch)` | `libraries` | Actualiza title + description |
| `deleteLibrary(id)` | `libraries` | Elimina biblioteca |
| `getLibraryShare(id)` | `libraries` | Lee share state |
| `updateLibraryShare(id, action)` | `libraries` | Toggle / regenerar share |
| `addBookmarkToLibrary(id, bookmark)` | `bookmark_on_library` | Añade patrón a biblioteca |
| `removeBookmarkFromLibrary(id, bmId)` | `bookmark_on_library` | Elimina patrón de biblioteca |

### AI routes (Phase 3 — Vercel serverless functions)

| Ruta | Auth | Descripción |
|------|------|-------------|
| `POST /api/library/ai/describe` | session, owner | Gemini auto-fill description |
| `POST /api/library/ai/export-code` | session, owner | Code scaffold export |
| `POST /api/library/ai/recommend` | session, owner | Pattern recommendations |
| `POST /api/library/ai/summarize` | session, owner | Generate library README |

---

## Migration Safety Rules

1. **Never drop columns in the same deploy that reads them.** `user_profiles.(library_title, share_token, ...)` se mantienen hasta que todas las lecturas en `library-cloud.ts` estén migradas a `libraries`.
2. **Crear fila `libraries` default lazily** (en primer request por usuario) o en un script de backfill — nunca en middleware.
3. **Bookmark deletion** en una biblioteca debe verificar si el bookmark existe en otras bibliotecas antes de eliminar de `user_bookmarks`.
4. **Share token uniqueness** es global — `libraries.share_token` usa constraint `UNIQUE` en Supabase.
5. **RLS primero:** toda nueva tabla debe tener RLS habilitado y policies definidas antes de ir a producción.

---

## Open Questions

| # | Question | Decision |
|---|----------|----------|
| 1 | Is "3 bookmarks free" per-library or per-account? | Deferred to monetization roadmap |
| 2 | Can a visitor add a pattern from a shared library to their own? | Not in scope yet |
| 3 | Should AI calls be rate-limited per user? | Yes — add before Phase 3 ships |
| 4 | Gemini model: `gemini-1.5-flash` (cheap) or `gemini-1.5-pro` (quality)? | Start with flash, upgrade per feature |
| 5 | Do library titles need to be unique per user, or globally? | Per-user uniqueness is sufficient |
