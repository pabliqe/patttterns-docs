---
title: Shared Libraries & Discovery
parent: Roadmaps
nav_order: 6
---

# ROADMAP — Shared Libraries & Public Discovery

**Objetivo:** Hacer que las bibliotecas públicas sean ciudadanos de primera clase en PATTTTERNS: contables, descubribles, indexables por motores de búsqueda y con URLs limpias que escalen a multi-library.

**Principios:**
- `/library` sin autenticación muestra el directorio público — ningún usuario anónimo ve una pared de login en blanco.
- Cero Netlify/Vercel function invocations para páginas públicas (todo cliente o SSG).
- Cada feature es deployable de forma independiente.
- Las decisiones de URL son compatibles con `ROADMAP_MULTILIBRARY` (Phase 2 schema).

**Dependencias:**
- `ROADMAP_SOCIAL_LOGINS` Etapas 1 + 2 ✅
- `ROADMAP_MULTILIBRARY` Phase 1 ✅
- `ROADMAP_MULTILIBRARY` Phase 2 (schema migration a tabla `libraries`) — requerida antes de Feature 4.

---

## 📊 Progreso Global

| Feature | Estado | Unblock |
|---------|--------|---------|
| 0. `OwnerAvatar` — fallback a inicial con caché de error | ✅ Completo (20 Abril 2026) | — |
| 1. View counter (por sesión) | 🔲 No iniciado | — |
| 2. Directorio público en `/library` | 🔲 No iniciado | — |
| 3. Library cards en el directorio | 🔲 No iniciado | Feature 2 |
| 4. URLs semánticas `/library/[username]` | 🔲 No iniciado | MULTILIBRARY Phase 2 |
| 5. Dynamic OG image por biblioteca | 🔲 No iniciado | Feature 4 (para URL canónica) |

---

## Feature 0 — `OwnerAvatar` con fallback a inicial ✅ *Completo*

**Objetivo:** Eliminar imágenes rotas de avatar cuando Google CDN devuelve 429 (common en bibliotecas públicas con muchos visitantes anónimos). Crear el componente base reutilizable para el directorio de bibliotecas (Feature 3).

### Qué se construyó

- [x] **`src/components/OwnerAvatar.tsx`** — componente standalone `"use client"`:
  - `src` prop: URL del avatar (Google OAuth o cualquier CDN).
  - `name` prop: nombre del usuario para derivar iniciales (hasta 2 caracteres).
  - `size` prop: diámetro en px, default 20. Controla `width/height` y `fontSize` proporcional.
  - `onError` en el `<img>` captura 429 y cualquier fallo de carga → estado `broken = true` → muestra badge de iniciales.
  - Fallback: `<span>` circular con `bg-primary/20 text-primary` y las iniciales. Si `name` es nulo → `"?"`.
  - Sin dependencias externas. Sin `next/image`. Cero server function invocations.
- [x] **`LibraryFlowView.tsx`** — sustituido el `<img src={ownerImage}>` raw (sin fallback) por `<OwnerAvatar src={ownerImage} name={ownerName} size={20} />`. El `OwnerAvatar` maneja el caso `ownerImage = null` internamente → ya no se necesita el wrapper `{ownerImage && ...}`.
- [x] **`AuthButton.tsx`** — sustituido el `next/image` + rama `else` de iniciales por `<OwnerAvatar src={user?.image} name={user?.name} size={40} />`. Eliminado `import Image from "next/image"` y la variable `initials` redundante.

### Por qué no `next/image`

`next/image` optimiza imágenes del propio dominio o dominios declarados en `next.config`. Los avatares de Google (`lh3.googleusercontent.com`) pueden marcarse como `unoptimized`, pero el componente no acepta `onError` de forma que permita reemplazar el render con JSX alternativo. El estado `broken` de `OwnerAvatar` requiere `useState` + re-render — patrón más limpio con `<img>` directa.

### Exit Criteria ✅

- [x] Avatar con URL Google que recibe 429 muestra inicial en lugar de imagen rota.
- [x] Avatar con `src = null` muestra inicial directamente (sin flash de imagen rota).
- [x] Componente reutilizable — listo para `PublicLibraryCard` (Feature 3) y futuras listas de bibliotecas.
- [x] `AuthButton` usa el mismo componente — consistencia visual y comportamiento idéntico.
- [x] Sin errores de TypeScript.

---

## Feature 1 — View Counter (por sesión)

**Objetivo:** Registrar cuántas veces se visita una biblioteca pública, sin contar recarga de la misma sesión.

### DB Changes (Supabase)

- [ ] Agregar columna `view_count integer NOT NULL DEFAULT 0` a `user_profiles`.
- [ ] Crear función RPC `increment_library_view(p_token text)` con `SECURITY DEFINER`:
  ```sql
  CREATE OR REPLACE FUNCTION increment_library_view(p_token text)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    UPDATE user_profiles
    SET view_count = view_count + 1
    WHERE share_token = p_token AND share_enabled = true;
  END;
  $$;
  GRANT EXECUTE ON FUNCTION increment_library_view(text) TO anon;
  ```
  `SECURITY DEFINER` impide que `anon` tenga permiso `UPDATE` directo en la tabla — solo ejecuta la función controlada.

### Client Changes

- [ ] Agregar `view_count: number` a `LibraryProfile` type en `library-cloud.ts`.
- [ ] Nueva función `recordLibraryView(shareToken: string)` en `library-cloud.ts`:
  - Verifica `sessionStorage.getItem("view_recorded_" + shareToken)`. Si ya existe, no hace nada.
  - Llama `POST /rest/v1/rpc/increment_library_view` con `{ p_token: shareToken }`.
  - Escribe `sessionStorage.setItem("view_recorded_" + shareToken, "1")`.
- [ ] En `library/page.tsx`, llamar `recordLibraryView(shareToken)` después de que `getPublicProfile` devuelve un perfil válido.
- [ ] Exponer `view_count` como prop en `LibraryFlowView` y `PublicLibraryCard` (Feature 3).

### Exit Criteria

- [ ] Visita nueva a biblioteca pública incrementa `view_count` en DB.
- [ ] Recargar la misma pestaña no vuelve a incrementar.
- [ ] Abrir en otra pestaña (mismo browser) no incrementa (mismo `sessionStorage`).
- [ ] `view_count` visible en el perfil del owner en su vista propia.

---

## Feature 2 — Directorio Público en `/library`

**Objetivo:** `/library` sin autenticación muestra una lista de bibliotecas públicas en lugar de un muro de login. Mejora SEO al indexar contenido real en una ruta canónica.

### DB Changes (Supabase)

- [ ] Crear vista `public_libraries` que consolide datos de bibliotecas públicas:
  ```sql
  CREATE VIEW public_libraries AS
  SELECT
    up.user_id,
    up.share_token,
    up.library_title,
    up.library_description,
    up.public_display_name,
    up.public_avatar_url,
    up.public_show_author,
    up.view_count,
    COUNT(b.pattern_id) AS bookmark_count,
    up.updated_at
  FROM user_profiles up
  LEFT JOIN bookmarks b ON b.user_id = up.user_id
  WHERE up.share_enabled = true
  GROUP BY up.user_id, up.share_token, up.library_title, up.library_description,
           up.public_display_name, up.public_avatar_url, up.public_show_author,
           up.view_count, up.updated_at;

  GRANT SELECT ON public_libraries TO anon;
  ```
  > **Nota:** Cuando se migre a la tabla `libraries` (MULTILIBRARY Phase 2), esta vista actualiza su `FROM` sin cambios en el cliente.

### Client Changes

- [ ] Nuevo tipo `PublicLibrarySummary` en `library-cloud.ts`:
  ```ts
  export type PublicLibrarySummary = {
    user_id: string;
    share_token: string;
    library_title: string | null;
    library_description: string | null;
    public_display_name: string | null;
    public_avatar_url: string | null;
    public_show_author: boolean;
    view_count: number;
    bookmark_count: number;
    updated_at: string;
  };
  ```
- [ ] Nueva función `getPublicLibraries(options?: { limit?: number; order?: "views" | "recent" })` en `library-cloud.ts` — llama a la vista via REST anon, orden default `view_count.desc`.
- [ ] En `library/page.tsx`, estado `unauthenticated`: reemplazar el bloque "Sign in" actual por el directorio público. El owner autenticado sigue viendo su biblioteca propia + opcionalmente el directorio debajo.

### Design Decision (requiere confirmación)

Tres opciones de layout para el directorio:

| Opción | UX | SEO |
|--------|-----|-----|
| A. Reemplaza el muro de login en `/library` | ✓ Usuario anónimo ve contenido útil | ✓ Ruta canónica indexable |
| B. Tab "Explore" dentro de `/library` | ✓ Separación clara owner/directorio | ⚠ Contenido detrás de tab (JS-gated) |
| C. Ruta separada `/library/explore` | ✓ URL propia, fácil de linkear | ✓ Indexable, pero nueva URL a establecer |

**Recomendación:** Opción A — menos fricción para usuarios anónimos y alineado con el principio de cero muro de login para contenido público.

### Exit Criteria

- [ ] Usuario anónimo en `/library` ve el directorio de bibliotecas públicas.
- [ ] La página es indexable (contenido renderizado en HTML, no JS-only).
- [ ] Owner autenticado no pierde acceso a su biblioteca propia.
- [ ] El directorio se ordena por `view_count DESC` como default.

---

## Feature 3 — Library Cards

**Objetivo:** Componente reutilizable para representar una biblioteca pública en el directorio. Muestra toda la información relevante de un vistazo.

### Client Changes Only (no DB changes)

- [ ] Nuevo componente `PublicLibraryCard` en `src/components/PublicLibraryCard.tsx`:
  - **Title:** `library_title` o fallback `"${public_display_name}'s Library"` o `"Unnamed Library"`.
  - **Description:** primeras 120 chars de `library_description`, truncada con ellipsis.
  - **Author:** visible solo si `public_show_author: true` — renderiza `OwnerAvatar` (con fallback a inicial, ver conversación previa) + `public_display_name`.
  - **# Patterns:** `bookmark_count` con label "pattern" / "patterns".
  - **# Views:** `view_count` con ícono de ojo, visible solo si `view_count > 0`.
  - **Link:** navega a `/library?token=<share_token>` (token URL actual) o a `/library/<slug>` una vez implementada Feature 4.
- [ ] Integrar `OwnerAvatar` (`src/components/OwnerAvatar.tsx` — implementado en Feature 0 ✅).
- [ ] Estado vacío cuando no hay bibliotecas públicas aún.
- [ ] Skeleton loading state mientras se cargan los datos.

### Exit Criteria

- [ ] Card muestra title, description truncada, author (condicional), # patterns, # views.
- [ ] Author oculto cuando `public_show_author: false`.
- [ ] Avatar roto (Google 429) cae al initial fallback sin UI rota.
- [ ] Click en card navega a la biblioteca correcta.

---

## Feature 4 — URLs Semánticas `/library/[username]`

**Objetivo:** Reemplazar `/library?token=TOKEN` por URLs limpias, memorizables e indexables por motores de búsqueda. Preparar la arquitectura de routing para multi-library.

**Dependencia:** `ROADMAP_MULTILIBRARY` Phase 2 (tabla `libraries` con campo `slug`).

### Design: Estructura de URLs

```
/library                      → Directorio público (Feature 2)
/library/[username]           → Biblioteca default del usuario (SEO-friendly)
/library/[username]/[slug]    → Biblioteca específica (multi-library, Phase 2+)
```

- `[username]` se deriva de `public_display_name` normalizado (lowercase, spaces → hyphens, sin caracteres especiales) o de un campo `username` único en `user_profiles`.
- El `share_token` actual sigue funcionando via redirect para backward compatibility (`/library?token=TOKEN` → 301 → `/library/[username]`).

### DB Changes (Supabase)

- [ ] Agregar campo `username text UNIQUE` a `user_profiles` (o a `libraries` si Phase 2 ya está hecha).
- [ ] Agregar campo `slug text` a tabla `libraries` para el nombre de cada biblioteca individual (multi-library).
- [ ] Constraint: `UNIQUE(user_id, slug)` en `libraries`.
- [ ] RLS: `username` y `slug` son legibles por `anon` para bibliotecas con `share_enabled = true`.
- [ ] Función de normalización de slug en Postgres o en cliente:
  ```ts
  function toSlug(name: string): string {
    return name.trim().toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
  ```

### Routing Changes (Next.js)

- [ ] Nueva ruta `src/app/library/[username]/page.tsx` — server component con `generateStaticParams` para SSG de bibliotecas públicas conocidas.
- [ ] Nueva ruta `src/app/library/[username]/[slug]/page.tsx` — para multi-library (puede ser stub que redirecciona a la default en fase inicial).
- [ ] Redirect en `src/app/library/page.tsx`: si `?token=TOKEN` en query string, resolver el username y hacer `redirect("/library/[username]", 301)`.
- [ ] Actualizar `PublicLibraryCard` (Feature 3) para linkear a `/library/[username]` en vez de `?token=TOKEN`.
- [ ] Actualizar `LibraryShareButton` para copiar la URL semántica en vez del token URL.

### SEO

- [ ] `generateMetadata` en `src/app/library/[username]/page.tsx` con title y description dinámicos.
- [ ] JSON-LD `ItemList` (ya planificado en MULTILIBRARY Phase 3b) — mover a esta ruta.
- [ ] `sitemap.ts` incluir todas las bibliotecas públicas con `share_enabled = true`.
- [ ] `robots.txt`: `/library/[username]` indexable; `/library?token=*` con `noindex` o 301 para evitar duplicados.

### Backward Compatibility

- [ ] `/library?token=TOKEN` → 301 → `/library/[username]` (resuelto en edge o en la page).
- [ ] QR codes y links existentes compartidos siguen funcionando.

### Exit Criteria

- [ ] `/library/username` carga la biblioteca correcta del usuario.
- [ ] Token URLs antiguas redireccionan a la URL semántica (301).
- [ ] Páginas de biblioteca públicas aparecen en `sitemap.xml`.
- [ ] `generateStaticParams` genera rutas estáticas para todas las bibliotecas públicas en build time.
- [ ] No hay regresión en `/library` (vista del owner) ni en `/library?token=TOKEN` durante la transición.

---

## Feature 5 — Dynamic OG Image por Biblioteca

**Objetivo:** Cada biblioteca pública genera su propio OG image dinámico con título, autor, número de patrones y un sample visual. Cuando alguien comparte el link en Slack, Twitter, iMessage, etc., la preview muestra la biblioteca real en vez del OG estático genérico de PATTTTERNS.

**Dependencia parcial:** Funciona con token URLs desde el día uno. La URL canónica `/library/[username]/opengraph-image.tsx` requiere Feature 4.

### Approach: Next.js `ImageResponse` (sin function invocations adicionales)

Next.js tiene soporte nativo para OG images dinámicas via [archivo `opengraph-image.tsx`](https://nextjs.org/docs/app/api-reference/file-conventions/opengraph-image) usando `@vercel/og` / `next/og`. En Vercel se ejecuta en Edge Runtime (no Lambda). Con `generateStaticParams` (Feature 4), las OG images de bibliotecas conocidas se generan en **build time como archivos estáticos** — cero invocaciones en runtime.

### No DB Changes

Todos los datos necesarios vienen de `PublicLibrarySummary` (Feature 2) o de los props de la ruta — sin nuevas columnas.

### Routing Changes (Next.js)

- [ ] **`src/app/library/[username]/opengraph-image.tsx`** — archivo de convención de Next.js App Router:
  ```tsx
  import { ImageResponse } from "next/og";
  import { getPublicLibraryByUsername } from "@/lib/library-cloud";

  export const runtime = "edge";
  export const alt = (params: { username: string }) =>
    `${params.username}'s Pattern Library`;
  export const size = { width: 1200, height: 630 };
  export const contentType = "image/png";

  export default async function OGImage({ params }: { params: { username: string } }) {
    const library = await getPublicLibraryByUsername(params.username);
    // Render via JSX — devuelve ImageResponse
  }
  ```
- [ ] **`src/app/library/opengraph-image.tsx`** — OG estático para el directorio público (no personalizado por library).

### Visual Design del OG Image

El canvas es 1200×630px. Layout propuesto:

```
┌─────────────────────────────────────────────────────────────┐
│  PATTTTERNS                                    [logo/mark]  │
│                                                             │
│  ████████████████████████████████                          │
│  Library Title (grande, hasta 2 líneas)                    │
│                                                             │
│  Library description truncada a ~120 chars...              │
│                                                             │
│  ○ Author Name        12 patterns    · 340 views           │
└─────────────────────────────────────────────────────────────┘
```

- Fondo: color de la marca (`#0a0a0a` o token `background`) con un sutil grid/noise.
- Tipografía: fuente del sistema vía `fetch()` de Google Fonts (Inter o la fuente de PATTTTERNS).
- Avatar del autor: `public_avatar_url` como `<img>` dentro del JSX de `ImageResponse`, con fallback a initial-letter si la URL falla.
- `public_show_author: false` → omitir sección de autor completamente.
- Colores extraídos de `brand.json` para consistencia con el sitio.

### Comportamiento con tokens vs URLs semánticas

| Escenario | OG image URL | Generación |
|-----------|-------------|------------|
| `/library?token=TOKEN` (hoy) | Estática genérica `og-library.png` | Build time |
| `/library/[username]` (Feature 4) | `/library/[username]/opengraph-image` | Build time (SSG) o Edge runtime |
| Link compartido en redes | La URL semántica en el `<meta og:image>` | — |

La `layout.tsx` de `/library` ya define un OG image estático genérico (`og-library.png`). Con Feature 4, la ruta `[username]/page.tsx` sobreescribe ese metadata via `generateMetadata` con la URL dinámica.

### `generateMetadata` en `[username]/page.tsx`

```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const library = await getPublicLibraryByUsername(params.username);
  const title = library?.library_title ?? `${params.username}'s Library`;
  const description = library?.library_description ?? "A curated pattern library on PATTTTERNS.";

  return {
    title: `${title} | PATTTTERNS`,
    description,
    openGraph: {
      title,
      description,
      // Next.js resuelve automáticamente la URL del opengraph-image.tsx colocalizado
    },
    twitter: { card: "summary_large_image" },
  };
}
```

Next.js App Router resuelve automáticamente `opengraph-image.tsx` colocalizado sin necesidad de hardcodear la URL — compatible con SSG y ISR.

### Fallback para el directorio `/library`

- [ ] Diseñar `og-library.png` estático mejorado (no dinámico) que represente el concepto de directorio: múltiples cards/grid vs. la imagen actual genérica. Puede hacerse offline en Figma y reemplazar el archivo en `public/`.

### Seguridad

- El endpoint `opengraph-image.tsx` solo expone datos de bibliotecas con `share_enabled = true` — misma RLS que el resto del flujo público.
- No hay datos sensibles en el OG image (solo title, description, author name, counts).
- El avatar del author se carga como `fetch()` dentro del Edge Function — si Google devuelve 429, el fallback a initial letter evita que el OG image rompa (mismo patrón que `OwnerAvatar`).

### Exit Criteria

- [ ] Compartir `/library/[username]` en Twitter/Slack muestra preview personalizada (no la genérica de PATTTTERNS).
- [ ] OG image incluye: título de la biblioteca, descripción, autor (si `public_show_author`), # patterns, # views.
- [ ] `public_show_author: false` → sin nombre ni avatar en el OG image.
- [ ] Biblioteca privada (`share_enabled: false`) → 404 en la ruta y no se genera OG image.
- [ ] OG images de bibliotecas conocidas se generan en build time (cero Edge invocations en runtime para visitas orgánicas).
- [ ] `/library` (directorio) tiene OG image estático mejorado.

---

## Consideraciones Transversales

### Privacidad

- El directorio público (Feature 2) solo expone bibliotecas donde `share_enabled = true`.
- `public_show_author: false` oculta nombre y avatar en el directorio Y en la library card.
- La URL semántica (Feature 4) también requiere `share_enabled = true` para ser accesible.
- Los owners pueden desactivar `share_enabled` en cualquier momento → la URL semántica devuelve 404.

### Performance & Costo

- Todo el directorio (Feature 2) y las library cards (Feature 3) son llamadas anon a Supabase REST — cero function invocations.
- Feature 4 con `generateStaticParams` genera HTML estático en build time — cero function invocations para visitas a bibliotecas públicas.
- El view counter (Feature 1) es la única llamada que escribe a DB — una vez por sesión, via RPC con `SECURITY DEFINER`.

### Relación con ROADMAP_MULTILIBRARY

| Item | Este Roadmap | ROADMAP_MULTILIBRARY |
|------|-------------|----------------------|
| `view_count` en `user_profiles` | Feature 1 | Migra a `libraries` en Phase 2 |
| Vista `public_libraries` | Feature 2 | Se actualiza su `FROM` en Phase 2 |
| URL `/library/[username]` | Feature 4 | Desbloquea `/library/[username]/[slug]` |
| `slug` en `libraries` | Feature 4 (schema) | Usado en Phase 5 (multi-library UI) |
| OG image dinámico | Feature 5 | Reutiliza `opengraph-image.tsx` del mismo segmento |

---

**Última Actualización:** 20 Abril 2026 (Feature 0 — OwnerAvatar implementado)
