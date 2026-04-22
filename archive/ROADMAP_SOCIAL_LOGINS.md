---
title: ✅ Identity & Persistence Infrastructure
parent: Roadmaps
---

# ROADMAP — Identity & Persistence Infrastructure

**Objetivo:** Implementar capa de identidad para PATTTTERNS.com que permita identificar usuarios, sincronizar datos en la nube y habilitar un Plan Pro en el futuro, sin romper la experiencia minimalista actual.

**Principios:**
- Login nunca intrusivo — se activa solo cuando el contexto lo justifica.
- `localStorage` sigue funcionando para usuarios anónimos (sin regresión).
- **Invariante de `localStorage`:** nunca contiene más de 3 bookmarks. Al hacer login, el contenido migra a Supabase y `localStorage` se vacía. Al hacer sign-out, `localStorage` también se vacía. El usuario siempre empieza limpio como anónimo.
- Cada etapa es deployable de forma independiente.
- Performance-first: el bundle de auth no debe penalizar el LCP de la galería.

---

## 📊 Progreso Global

| Etapa | Estado | Unblock |
|-------|--------|---------|
| Etapa 1: Social Login (Google) | ✅ Completo | — |
| Etapa 2: Cloud Sync + Biblioteca | ✅ Completo | — |
| Etapa 3: GitHub OAuth | 🔲 Pendiente | — (desbloqueado) |
| Etapa 4: Plan Pro | 🔲 Pendiente | Etapas 1 + 2 |

---

## 🏗️ Arquitectura de Decisiones (ADR)

> **Nota (Abril 2026):** La implementación real difiere del ADR original. Se eligió Supabase Auth client-side (Opción B del Anexo A) para mantener static export y cero invocaciones de servidor para páginas públicas.

| Decisión | Elección original | Elección real | Rationale |
|----------|--------------------|---------------|-----------|
| Auth framework | NextAuth v5 | **Supabase Auth (client-side)** | Static export compatible; cero API routes para auth |
| DB | Supabase (PostgreSQL) | **Supabase (PostgreSQL)** | Sin cambios |
| ORM | Prisma | **Sin ORM — Supabase REST directo** | Compatible con static export; RLS reemplaza server-side auth |
| Sesión | JWT + DB session | **Token JWT en localStorage** (Supabase) | Client-side only |
| Primer proveedor | Google | **Google via Supabase OAuth** | Sin cambios en UX |
| Bundle strategy | Dynamic import | **Supabase client cargado on-demand** | Sin penalizar LCP |
| Deploy mode | `@netlify/plugin-nextjs` | **Vercel + static export** | Migrado en Marzo 2026 (ver ROADMAP.md) |

---

## Etapa 1: Social Login (Google OAuth) ← *Completo* ✅

**Objetivo:** Identificar usuarios con cero fricción. Habilitar el primer punto de conversión real.

**Trigger de login:** Al intentar guardar el 4to bookmark → se muestra `LoginModal` con propuesta de valor clara.

> **Estado real (Abril 2026):** Implementación completa con Supabase Auth client-side en lugar de NextAuth. El flujo OAuth funciona extremo a extremo: Google OAuth → Supabase → `/auth/callback` → sesión restaurada en localStorage. Todos los criterios de aceptación cumplidos.

### Tareas técnicas

- [x] **Deps:** `@supabase/supabase-js` (auth client-side, sin NextAuth ni Prisma).
- [x] **Auth client:** `src/lib/auth-client.tsx` — facade con `useAuth()`, `signIn()`, `signOut()`, `restoreSupabaseSession()`.
- [x] **Supabase OAuth flow:** Redirect a Supabase → callback en `src/app/auth/callback/page.tsx` → token guardado en localStorage.
- [x] **Static export compatible:** `output: 'export'` mantenido. NextAuth route reemplazado por stub estático.
- [x] **Env vars:** `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `.env.local` y Vercel.
- [x] **AuthButton component:** `src/components/AuthButton.tsx` — consume `useAuth()` facade.
- [x] **LoginModal component:** `src/components/LoginModal.tsx` — CTA Google OAuth via Supabase.
- [x] **AuthSessionProvider:** Provee contexto auth global + `LoginModal` + `SyncRunner`.
- [x] **useUserSync hook:** `src/lib/useUserSync.ts` — detecta transición anónimo→autenticado, migra y hidrata.
- [x] **BookmarkButton gate:** `status === "unauthenticated"` para evitar falsos negativos en estado `loading`.
- [x] **AuthButton en Header:** Desktop + mobile.
- [x] **Ruta `/dashboard`:** Placeholder estático (vista de cuenta, pending Plan Pro).

### Variables de entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
# Supabase dashboard: habilitar Google OAuth provider y agregar /auth/callback como redirect URL
```

### Criterios de aceptación

- [x] Usuario puede hacer Sign-in con Google desde el navbar o desde el `LoginModal`.
- [x] Al guardar el 4to bookmark sin sesión → `LoginModal` se abre con propuesta de valor.
- [x] Usuario autenticado ve su avatar en el navbar con menú desplegable.
- [x] BookmarkButton funciona igual para los primeros 3 saves (sin login).
- [x] Bookmarks del usuario autenticado se persisten en Supabase.
- [x] Ruta `/dashboard` existe y devuelve al inicio si no hay sesión.
- [x] Bundle de auth no incrementa LCP > 100ms (static export: cero JS de auth en LCP path).

---

## Etapa 2: Cloud Sync + Biblioteca

**Objetivo:** Tres experiencias encadenadas que hacen que la cuenta "se sienta real": migración silenciosa al login, feedback visual de que los datos están seguros, y una biblioteca personal navegable.

**Dependencia:** Etapa 1 cerrada.

---

### 2.1 — Migración Silenciosa (El Momento Aha!) ✅

> Si el usuario tenía patrones guardados anónimamente y se loguea, aparecen mágicamente en su cuenta.

**Implementado en:** `src/lib/useUserSync.ts`, `src/lib/bookmark-cloud.ts`

- [x] `useUserSync` detecta transición `unauthenticated → authenticated` (y `loading → authenticated` post-redirect OAuth).
- [x] Lee bookmarks de localStorage vía `useBookmarks.getState().items`.
- [x] Llama `mergeGuestBookmarksToCloud(localBookmarks)` en `bookmark-cloud.ts` — bulk upsert a `user_bookmarks` en Supabase.
- [x] Re-hidrata el store desde la API (`listCloudBookmarks()`) para obtener el merged result.
- [x] Limpia localStorage post-sync (`localStorage.removeItem(BOOKMARKS_STORAGE_KEY)`).
- [x] Merge sin colisión: upsert idempotente por `(user_id, pattern_id)` — nunca duplica.
- [x] `SyncToast` muestra *"N patrones sincronizados con tu cuenta."* cuando `synced > 0`.
- [x] `sessionSyncDone` flag evita rehidrataciones redundantes en navegación entre páginas.
- [x] Pending bookmark (el que disparó el auth-gate) se recupera post-redirect via `PENDING_BOOKMARK_KEY` en localStorage.

---

### 2.2 — UI de Sync Status ✅

**Implementado en:** `src/lib/useSyncStatus.ts`, `src/components/SyncToast.tsx`

- [x] `useSyncStatus` store (Zustand) con estados `idle | hydrating | syncing | synced | error`.
- [x] `BookmarkButton` transiciona a `syncing → synced | error` en cada llamada a la API.
- [x] `SyncToast` muestra mensaje contextual post-migración con auto-dismiss.

---

### 2.3 — Biblioteca Personal (`/library`) ✅

**Implementado en:** `src/app/library/page.tsx`, `src/components/LibraryFlowView.tsx`, `src/components/LibraryEmptyState.tsx`

- [x] `/library` es shell estática hidratada client-side (`"use client"` + `useAuth()` + `useBookmarks()`).
- [x] Vista owner: carga bookmarks del store (fuente: Supabase REST via `useUserSync`).
- [x] Vista pública: carga via `getPublicProfile(token)` + `getPublicBookmarks(userId)`.
- [x] `LibraryEmptyState` con chips de búsqueda rápida (Onboarding, Modals, etc.).
- [x] Avatar dropdown → "My Library" apunta a `/library`.
- [x] Redirige al inicio si no hay sesión.

---

### Criterios de aceptación — Etapa 2

- [x] Al hacer login con bookmarks locales, aparecen en la cuenta y se muestra el Toast de migración.
- [x] Al guardar un bookmark estando logueado, se persiste en Supabase inmediatamente (optimistic update + API call).
- [x] Los bookmarks se sincronizan entre Desktop y Mobile para un usuario autenticado.
- [x] Al cerrar sesión, `localStorage` se vacía — el usuario vuelve al estado anónimo limpio (0 bookmarks locales).
- [x] El sync es idempotente — recargar no duplica bookmarks.
- [x] El indicador de sync status refleja el estado real (syncing/synced/error).
- [x] `/library` muestra la colección del usuario o el empty state accionable.
- [x] `/library` redirige al inicio si no hay sesión.

---

## Etapa 3: GitHub OAuth Provider 🔲 *Pendiente*

**Objetivo:** Agregar GitHub como segundo proveedor OAuth para audiencia técnica/devs.

**Dependencia:** Ninguna (desbloqueado). Supabase Auth soporta múltiples providers nativamente.

### Tareas técnicas

- [ ] **Habilitar GitHub provider en Supabase dashboard** (Settings → Auth → Providers → GitHub).
- [ ] **Env vars Supabase:** `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` cargados en Supabase (no en Vercel).
- [ ] **Actualizar `LoginModal`:** Agregar botón GitHub con ícono; llama `signIn('github')`.
- [ ] **Actualizar `buildSupabaseOAuthUrl`** en `auth-client.tsx` para soportar `provider = 'github'`.
- [ ] **Account linking:** Supabase vincula por email automáticamente si `"link_accounts"` está habilitado en el dashboard. Verificar que mismo email vía Google y GitHub no crea `user_id` duplicado.

### Criterios de aceptación

- [ ] Usuario puede autenticarse con GitHub o Google.
- [ ] Un mismo email via distintos providers no crea usuarios duplicados en `auth.users`.

---

## Etapa 4: Plan Pro

**Objetivo:** Habilitar una capa de acceso premium para funcionalidades avanzadas: colecciones ilimitadas, exportación, etiquetas personalizadas, etc.

**Dependencia:** Etapas 1 y 2 completadas.

### Tareas técnicas

- [ ] **Campo `is_pro`** en tabla `users` (ya incluido en el schema de Etapa 1).
- [ ] **Integración de pagos:** Evaluar Stripe o Lemon Squeezy. Webhook para actualizar `is_pro = true` al completar pago.
- [ ] **API Route `/api/billing/checkout`:** Crear sesión de pago.
- [ ] **API Route `/api/billing/webhook`:** Manejar eventos de pago y actualizar DB.
- [ ] **Página `/pro`:** Landing con tabla de features Free vs Pro, CTA a checkout.
- [ ] **Gate de features Pro:** HOC o middleware que verifique `session.user.is_pro` para acceder a funcionalidades premium.
- [ ] **Página `/dashboard`:** Vista de cuenta del usuario (bookmarks, plan, billing).

### Criterios de aceptación

- [ ] Usuario Free ve restricciones claras con CTA a Plan Pro.
- [ ] Usuario Pro tiene acceso a funcionalidades premium.
- [ ] Webhook de pagos es idempotente y maneja reintentos.
- [ ] La página `/pro` convierte > X% (definir baseline post-lanzamiento).

---

## Anexo A: Decisión de Arquitectura de Deploy para Auth

> **Contexto:** El sitio actualmente usa `output: 'export'` en Next.js, lo que genera HTML 100% estático. NextAuth requiere server runtime para sus API Routes (`/api/auth/*`). Esto es incompatible con el modo static export y necesita resolverse antes de implementar cualquier autenticación.

### Opción A — `@netlify/plugin-nextjs` (Hybrid SSG + Functions)

**Cómo funciona:**
- Se elimina `output: 'export'` del `next.config.ts`.
- Se agrega `@netlify/plugin-nextjs` al `netlify.toml`.
- Las páginas de la galería siguen siendo **SSG** (pre-rendered en build time) → se sirven desde CDN de Netlify, **sin costo por invocación**.
- Solo las rutas dinámicas y API routes usan **Netlify Functions** (Lambda).

**Cambios requeridos:**
```diff
# netlify.toml
+[[plugins]]
+  package = "@netlify/plugin-nextjs"

 [build]
-  publish = "out"
+  publish = ".next"
```
```diff
# next.config.ts
-  output: process.env.NODE_ENV === "production" ? "export" : undefined,
```

**Estimación de Netlify Function invocations (Opción A):**

| Acción | Invocaciones por evento |
|--------|------------------------|
| Sign-in (redirect + callback + session) | ~3 |
| Sign-out | ~2 |
| Session check en rutas protegidas (SSR) | ~1 por visita |

Con galería 100% SSG (no hay session checks en server para páginas públicas), solo se impactan las acciones explícitas de auth.

| Escenario | Usuarios activos/mes | Invocaciones estimadas |
|-----------|---------------------|----------------------|
| MVP Early adopters | 200 | ~2.000–4.000 |
| Crecimiento moderado | 1.000 | ~8.000–15.000 |
| Escala | 5.000 | ~40.000–60.000 |

**Límite Netlify Free:** 125.000 invocaciones/mes → holgado en los 3 escenarios.

**Pros:**
- ✅ Soporta NextAuth v5 nativamente.
- ✅ Compatible con Prisma + Supabase (full server-side DB access).
- ✅ Galería sigue sirviendo desde CDN (0 costo, máxima performance).
- ✅ Habilita Etapa 2 (API routes para Cloud Sync) sin cambios adicionales.
- ✅ Habilita webhooks de billing (Etapa 4) sin cambios adicionales.
- ✅ Compatible con el plugin `notion-cache` existente.

**Contras:**
- ⚠️ Cambio de infra puntual (1-2 archivos). Riesgo bajo.
- ⚠️ El build ya no genera `/out`, cambia a `.next`. Netlify lo maneja automáticamente.
- ⚠️ Necesita confirmar que el plugin `notion-cache` local sigue siendo compatible.

---

### Opción B — Supabase Auth Client-Side (sin NextAuth, sin servidor)

**Cómo funciona:**
- Se usa `@supabase/supabase-js` directamente en el cliente.
- Supabase maneja el OAuth de Google (redirect flow) sin necesidad de API routes.
- La sesión se almacena en cookies/localStorage via el SDK de Supabase.
- `output: 'export'` **se mantiene intacto**. Cero cambios de infra.

**Cambios requeridos:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```
```diff
# next.config.ts
# Sin cambios
```

**Estimación de uso Supabase Free Tier:**

| Recurso | Límite Free | Estimado uso |
|---------|-------------|--------------|
| MAU (Monthly Active Users) | 50.000 | < 5.000 |
| DB Size | 500 MB | < 50 MB |
| Auth requests | Sin límite explícito | OK |
| Edge Function invocations | 500k/mes | N/A para auth |

**Pros:**
- ✅ **Cero cambios de infra Netlify**. Static export se mantiene.
- ✅ Sin Netlify Function invocations para auth (todo client-side).
- ✅ Supabase Auth maneja OAuth, sesiones, account linking nativamentea.
- ✅ SDK de Supabase unifica auth + DB (un solo cliente para todo).
- ✅ Más simple de implementar inicialmente.

**Contras:**
- ⚠️ **Sin NextAuth** — el ADR original propone NextAuth v5. Supabase Auth es una API diferente.
- ⚠️ Para proteger rutas server-side (middleware, rutas `/dashboard`, `/pro`), se necesita `@supabase/ssr` con cookies — requiere middleware Supabase en lugar de NextAuth middleware.
- ⚠️ Si en el futuro se quiere mover a otro proveedor, el vendor lock-in con Supabase Auth es mayor.
- ⚠️ Etapa 2 (Cloud Sync) y Etapa 4 (webhooks de billing) **igualmente requieren API routes** → el problema de static export solo se pospone, no se resuelve.
- ⚠️ Las API Routes de `/api/bookmarks/sync` y `/api/billing/webhook` en Etapas 2 y 4 van a forzar la misma decisión de infra más adelante.

---

### Recomendación

| Criterio | Opción A (@netlify/plugin-nextjs) | Opción B (Supabase Auth) |
|----------|-----------------------------------|--------------------------|
| Complejidad de infra hoy | Media (1-2 archivos de config) | Baja (cero cambios infra) |
| Complejidad total del proyecto | **Baja** (resuelve el problema de raíz) | **Alta** (problema reaparece en Etapa 2 y 4) |
| Compatibilidad con plan de roadmap | ✅ Completo | ⚠️ Parcial |
| Costo Netlify Free | Muy bajo (~5-15k invocaciones/mes) | Cero (auth) |
| Vendor lock-in | Bajo (NextAuth es agnóstico) | Alto (Supabase Auth) |
| Flexibilidad futura | Alta | Media |

**Recomendación técnica: Opción A.** El cambio de infra es puntual y de bajo riesgo. Bloquear el problema hoy con Supabase Auth solo lo desplaza a las Etapas 2 y 4 donde de todas formas se necesitan API routes. Resolverlo ahora deja la arquitectura limpia para todo el roadmap.

> **Decisión:** ✅ **Opción A — `@netlify/plugin-nextjs`** — implementada el 3 Abril 2026.

---

**Última Actualización:** 2 Abril 2026
