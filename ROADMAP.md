# ROADMAP - PATTTTERNS

## 🚀 Migración Netlify → Vercel (En Progreso)

**Objetivo:** Migrar a Vercel aprovechando fin de semana con bajo tráfico de usuarios.  
**Ventana Estimada:** Viernes – Lunes  
**Estado Actual:** Preparación (Viernes)

---

### 📋 Fase 1: Hoy - Preparación y Baseline

**Duración Estimada:** 2-3 horas  
**Responsable:** Pablo

- [x] **Congelar cambios de producto** – Solo fixes de migración hasta el lunes.
- [x] **Definir ventana de corte** – Sábado madrugada o domingo madrugada (menor tráfico).
- [x] **Exportar baseline de Netlify actual:**
  - [x] Snapshot de URLs críticas (home, categorías, patrones, sitemap, robots).
  - [x] Métricas: errores 4xx/5xx, latencia p50/p99, invocaciones diarias.
  - [x] Captura de pantalla de dashboard Netlify (deployments, performance).
- [x] **Inventariar variables de entorno:**
  - [x] `NOTION_API_KEY` ✓ (en .env.local)
  - [x] `NOTION_HOMEPAGE_ID` ✓ (en site.config.mjs)
  - [x] `NOTION_UX_PATTERNS` ✓ (en site.config.mjs)
  - [x] `NOTION_UI_PATTERNS` ✓ (en site.config.mjs)
  - [x] `NOTION_ALL_PATTERNS_DATABASE_ID` ✓ (en site.config.mjs)
  - [x] `NEXT_PUBLIC_GA_ID` ✓ (G-K1F96PRZNS, en .env.local)
  - [x] `NEXT_PUBLIC_POSTHOG_KEY` ✓ (en .env.local)
  - [x] `NEXT_PUBLIC_POSTHOG_HOST` ✓ (en .env.local)
- [x] **Revisar dependencias Netlify a migrar:**
  - [x] Plugin Next.js en `netlify.toml` línea 19.
  - [x] Headers de seguridad/caché en `netlify.toml` líneas 22-33. → Migrados a `next.config.ts` `headers()`.
  - [x] Rewrites de PostHog en `next.config.ts` líneas 4-13. → Ya estaban en Next config, portables sin cambios.
  - [x] Instrumentation PostHog en `instrumentation-client.ts`.
- [x] **Definir estrategia de rollback:**
  - [x] Mantener Netlify activo y listo (sin desactivar).
  - [x] TTL DNS bajo (5 min) para cutover rápido.
  - [x] Validar acceso a panel Netlify y DNS provider.

**Entregables:**
- Baseline.md con métricas actuales.
- env.checklist.txt con variables confirmadas.
- rollback.plan.txt con pasos exactos.

---

### 🔧 Fase 2: Sábado - Deploy Técnico en Vercel (Sin cambio de DNS)

**Duración Estimada:** 3-4 horas  
**Responsable:** Pablo

#### 2.1 Configuración Inicial

- [x] **Crear proyecto en Vercel:**
  - [x] Ir a https://vercel.com/new
  - [x] Importar repositorio "patttterns-next" desde GitHub.
  - [x] Seleccionar rama: `main`
  - [x] Framework: Next.js (auto-detectado).
- [x] **Configurar build settings:**
  - [x] Build command: `npm ci && npm run build` (o auto-detectado).
  - [x] Output directory: `.next` (auto-detectado).
  - [x] Install command: `npm ci` (auto-detectado).
- [x] **Cargar variables de entorno en Vercel:**
  - [x] Environment: Production + Preview
  - [x] Variables requeridas:
    ```
    NOTION_API_KEY=ntn_...
    NOTION_HOMEPAGE_ID=84b89b2059f54c58882c69613e003099
    NOTION_UX_PATTERNS=b0b42a6bb3784d2d9f63715402428995
    NOTION_UI_PATTERNS=4b5061ca621648c4baab6686d7ad6264
    NOTION_ALL_PATTERNS_DATABASE_ID=e642abc6cc7b43e1a2eef35a0e0ccbae
    NOTION_TOKEN=v03%3A...
    NEXT_PUBLIC_GA_ID=G-K1F96PRZNS
    NEXT_PUBLIC_POSTHOG_KEY=phc_ILjkzP4q7Xfx95JCcMUAXlQc4bOg1QosNPk2QhaHTEU
    NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
    NOTION_FETCH_RETRY_ATTEMPTS=5
    NOTION_FETCH_MAX_DELAY_MS=8000
    NOTION_FETCH_TIMEOUT_MS=30000
    NOTION_FAIL_FAST=1
    ```
  - [x] Confirmar que Vercel propone variables auto-detectadas de `.env.example`.

#### 2.2 Deploy Inicial y Validación de Build

- [x] **Ejecutar primer deploy:**
  - [x] Click "Deploy" en Vercel UI.
  - [x] Observar logs de build en tiempo real.
  - [x] Confirmar build exitoso (sin errores críticos).
  - [x] Anotar URL preview autogenerado (ej: `patttterns-pablo.vercel.app`).
- [x] **Validar arranque y conectividad Notion:**
  - [x] Ver logs de deployment (pestaña "Logs").
  - [x] Confirmar que no hay errores de API_KEY, conexión a Notion.
  - [x] Verificar que Notion data fluye (no es null/undefined).

#### 2.3 Validación Funcional de Rutas Críticas

Acceder a preview URL y verificar cada una:

- [x] **Home:** `https://patttterns-xxxxx.vercel.app/`
  - [x] Carga sin errores.
  - [x] Notion page visible (contenido inline).
  - [x] Navegación en header funcional.
- [x] **Listado de patterns:** `/patterns`
  - [x] Se cargan todos los patrones.
  - [x] Grid de tarjetas visible.
  - [x] Búsqueda funciona (si existe).
- [x] **Detalle de patrón:** `/patterns/[id]` (click en uno)
  - [x] Se abre la página del patrón.
  - [x] Imágenes cargan (Notion covers).
  - [x] Botón "Save" / bookmark funciona.
- [x] **Categoría UX (Flows):** `/ux-patterns`
  - [x] Se carga la página de categoría.
  - [x] Subcategorías y items visibles.
- [x] **Categoría UI (Components):** `/ui-patterns`
  - [x] Se carga la página de categoría.
  - [x] Subcategorías y items visibles.
- [x] **Detalle de categoría:** `/ux-patterns/[slug]` o `/ui-patterns/[slug]`
  - [x] Se abre correctamente.
  - [x] Contenido de Notion visible.
- [x] **Sitemap:** `/sitemap.xml`
  - [x] Retorna XML válido.
  - [x] Estructura coherente con slugs.
- [x] **Robots:** `/robots.txt`
  - [x] Permite crawl.
  - [x] Referencia a sitemap.xml.

#### 2.4 Validación de Redirects y Legacy Routes

Probar rutas antiguas que deberían redirigir (via proxy en `src/proxy.ts`):

- [x] `/pattern/[slug]` → `/patterns/[slug]` (HTTP 308)
- [x] `/all-patterns/[slug]` → `/patterns/[slug]` (HTTP 308)
- [x] `/[notion-id-raw]` → `/patterns/[canonical-slug]` (HTTP 308)
- [x] Notion IDs en form UUID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` → redirección correcta.

#### 2.5 Validación de Features Transversales

- [x] **Analytics:**
  - [ ] Abrir DevTools → Console.
  - [ ] Clickear "Save" en un patrón.
  - [ ] Ver evento `save_pattern_from_footer` en console (o GA si production).
  - [ ] PostHog beacon visible en Network tab.
- [ ] **OG Tags (Open Graph):**
  - [ ] Inspeccionar una URL de detalle:
    ```bash
    curl -I https://patttterns-xxxxx.vercel.app/patterns/grid-pattern-12345 | grep og:
    ```
  - [ ] Confirmar presencia de `og:title`, `og:image`, `og:url`.
- [ ] **Dark Mode / Theme:**
  - [ ] Toggle dark/light en header.
  - [ ] Estilos applicados correctamente.
- [ ] **Responsividad Mobile:**
  - [ ] DevTools → Mobile view (iPhone 12).
  - [ ] Layout readable y funcional.
  - [ ] Hamburger menu funciona (si aplica).

#### 2.6 Documentar Findings

- [x] Activar Vercel Analytics
- [x] Activar Vercel Speed Performance

**Entregables:**
- Vercel project URL.
- Validation report (SAT_validation.md).
- Lista de issues encontrados (si hay).

---

### ✅ Fase 3: Domingo - Pre-Cutover y Cutover de DNS

**Duración Estimada:** 2-3 horas  
**Responsable:** Pablo

#### 3.1 Configuración de Dominio en Vercel

- [x] **En Vercel dashboard:**
  - [x] Ir a Project Settings → Domains.
  - [x] Agregar dominio: `patttterns.com`
  - [x] Copiar registros DNS que Vercel propone (puede ser nameservers o registros A/CNAME).
- [x] **Preparar DNS provider** (GoDaddy, Namecheap, etc.):
  - [x] Acceder a panel de DNS.
  - [x] **Bajar TTL a 5 minutos** (para cutover ágil).
  - [x] Preparar pasos exactos para cambiar registros (pero no apretaras todavía).
  - [x] Se configuró un dominio temporal: `vercel.patttterns.com`

#### 3.2 Smoke Test Final (30 min antes de cutover)

Con la preview URL aún en Vercel y Netlify activo:

- [x] Ejecutar test rápido en preview:
  - [x] Home carga: ✓/✗
  - [x] Patrón abre: ✓/✗
  - [x] Redirect legacy funciona: ✓/✗
  - [x] OG tag correcto: ✓/✗
- [x] Confirmar que Netlify sigue respondiendo en `patttterns.com` (baseline actual).
- [x] Validar rollback fácil: ¿puedo volver DNS a Netlify en <5 min? ✓/✗

#### 3.3 Cutover de DNS (Ventana: Entre 22:00 DOM y 04:00 LUN)

- [x] **Definir hora exacta** (ej: domingo 23:30 UTC).
- [x] **Notificar a stakeholders** (si hay) 30 min antes.
- [x] **Cambiar registros DNS** en provider:
  - [x] Si Vercel propone nameservers: cambiar NS en provider.
  - [x] Si Vercel propone A/CNAME: actualizar registros.
  - [ ] Guardar cambios (click "Save").
- [x] **Esperar propagación** (~5-15 min típico, máximo 1 hora).
- [x] **Validar que DNS apunta a Vercel:**
  ```bash
  nslookup patttterns.com
  # Debe retornar IPs de Vercel (ej: 76.76.19.165)
  dig patttterns.com @8.8.8.8
  # Debe resolver a Vercel.
  ```

#### 3.4 Validación Inmediata Post-Cutover (30-60 min)

Repetir validación de Fase 2.3, pero ahora en dominio real:

- [x] **Home:** `https://patttterns.com/` carga sin errores.
- [x] **Patrón:** `/patterns/[slug]` funciona.
- [x] **Categoría:** `/ux-patterns` y `/ui-patterns` funcionan.
- [x] **Redirects legacy:** `/pattern/[slug]` redirige correctamente.
- [x] **Analytics:** eventos se envían correctamente.
- [x] **OG tags:** correctos en prod.
- [x] **Status codes:**
  ```bash
  curl -I https://patttterns.com/ | grep HTTP
  # Debe ser 200
  curl -I https://patttterns.com/pattern/old-slug | grep HTTP
  # Debe ser 308 (redirect)
  ```

#### 3.5 Monitoreo Activo (30-60 min post-cutover)

- [x] Abrir Vercel dashboard → Analytics/Logs.
  - [x] ¿Hay errores 5xx? → Escalera a rollback.
  - [ ] ¿Latencia es razonable? (comparar vs Netlify baseline).
  - [ ] ¿Notion API calls están dentro de límites?
- [x] Abrir Google Analytics (si aplica).
  - [ ] ¿Eventos llegan? ¿Tráfico es normal?
- [ ] Abrir PostHog (si aplica).
  - [ ] ¿Eventos PostHog llegan?
- [ ] Revisar correos/alertas de errores (si tienes setups).

#### 3.6 Decisión Go / No-Go para Mantener

- [x] **Si todo está OK:**
  - [ ] Documentar: "Cutover exitoso a Vercel. Métricas coherentes."
  - [x] Dejar Netlify en standby (no deletear aún).
  - [x] Ir a Fase 4.
- [ ] **Si hay problemas menores:**
  - [ ] Notar issue en log de progreso.
  - [ ] Intentar fix rápido (ej: restart deploy, variable de env).
  - [ ] Si es <5 min = continuar. Si >15 min = rollback.
- [ ] **Si hay problema crítico (5xx masivos, Notion timeout):**
  - [ ] Revertir DNS inmediatamente a Netlify.
  - [ ] Confirmar que `patttterns.com` vuelve a responder.
  - [ ] Abrir incidente en GitHub Issues con logs.
  - [ ] Pausar migración hasta resolver causa.

**Entregables:**
- Cutover log (fecha/hora exact, cambios DNS).
- Post-cutover validation report.
- Incidentes encontrados (si hay).

---

### 📊 Fase 4: Lunes - Estabilización y Cierre

**Duración Estimada:** 2-3 horas (distribuidas durante el día)  
**Responsable:** Pablo

#### 4.1 Monitoreo 24h Post-Cutover

- [x] **Mañana del lunes (office hours):**
  - [x] Revisar Vercel analytics y logs.
  - [x] Comparar baseline (viernes Netlify) vs lunes (Vercel).
  - [x] ¿Errores nuevos? ¿Latencia peor?
  - [x] ¿Invocaciones/costo dentro del presupuesto?
- [x] **Revisar alertas/reports:**
  - [x] Google Analytics: tráfico normal.
  - [ ] PostHog: eventos llegan sin delays.
  - [ ] Email alerts de Vercel (si tiene).

#### 4.2 Validación SEO Técnica

- [x] **Robots.txt:**
  - [x] `curl https://patttterns.com/robots.txt`
  - [x] Contiene: `Allow: /` y `Sitemap: https://patttterns.com/sitemap.xml` ✓
- [x] **Sitemap.xml:**
  - [x] `curl https://patttterns.com/sitemap.xml | head -20`
  - [x] Contiene entries válidas (patterns, categorías, etc).
- [x] **Canonical links:**
  - [x] Abrir un patrón con DevTools → Inspect.
  - [x] Verificar presencia de `<link rel="canonical" href="https://patttterns.com/patterns/...">` ✓
- [x] **Index status en Google:**
  - [x] Ir a Google Search Console (si tienes acceso).
  - [x] Buscar: `site:patttterns.com`
  - [x] ¿Se indexó correctamente? (puede tardar 24-48h).

#### 4.3 Ajustes de Configuración (si necesario)

- [x] **Revisar páginas /debug:**
  - [ ] Están en `force-dynamic` (ej: `/debug/routes`, `/debug/og`).
  - [ ] ¿Generan costo innecesario? Considerar:
    - [ ] Agregar auth/password (proteger).
    - [ ] Hacer estáticas (si no necesitan datos nuevos).
    - [ ] Deletear si no se usan.
- [x] **Revisar proxy rules en `src/proxy.ts`:**
  - [x] ¿Todos los redirects son necesarios?
  - [x] ¿Hay oportunidad de optimizar (ej: agrupar patterns)?
  - [x] Anotar para mejoras futuras.
- [x] **Revisar caché headers:**
  - [x] ¿Vercel aplica correctamente los headers del next.config.ts?
  - [x] Probar: `curl -I https://patttterns.com/_next/static/... | grep cache-control`

#### 4.4 Limpiar y Documentar

- [ ] **Desactivar Netlify:**
  - [ ] (Opcional) Cambiar "production branch" de Netlify a rama `archived` o deletear el site.
  - [ ] O mantener en standby 1 semana más por si hay rollback emergente.
- [x] **Documentar migración en ROADMAP.md:**
  - [x] Marcar fases completadas.
  - [x] Notar problemas encontrados y cómo se resolvieron.
  - [x] Anotar lecciones aprendidas.
- [ ] **Crear MIGRATION_SUMMARY.md:**
  - [ ] Baseline pre-migración (Netlify metrics).
  - [ ] Post-migración (Vercel metrics).
  - [ ] Diferencias (costo, latencia, errores, etc).
  - [ ] Decisiones tomadas y rationale.
  - [ ] Acciones pending (si hay).
- [ ] **Actualizar documentación:**
  - [ ] [DEPLOY.md](DEPLOY.md) → Cambiar instrucciones de Netlify a Vercel.
  - [ ] [README.md](README.md) → Mencionar que ahora está en Vercel.

#### 4.5 Retrospectiva (Opcional)

- [x] ¿Qué salió bien?
- [x] ¿Qué fue inesperado?
- [x] ¿Qué podríamos mejorar para futuras migraciones?
- [x] ¿Hay deuda técnica que arreglar? (ej: pages /debug, proxy rules).

**Entregables:**
- MIGRATION_SUMMARY.md
- Documentación actualizada (DEPLOY.md, README.md)
- GitHub Issues (si hay acciones pendientes)

---

## 📈 Métricas de Éxito

| Métrica | Baseline (Netlify) | Target (Vercel) | Status |
|---------|-------------------|-----------------|--------|
| Latencia p50 (ms) | ___ | < baseline | ⏳ |
| Latencia p99 (ms) | ___ | < baseline * 1.2 | ⏳ |
| Errores 5xx/semana | ___ | 0 | ⏳ |
| Errors 4xx esperados | ___ | Mismo | ⏳ |
| Invocaciones Notion/día | ___ | Similar | ⏳ |
| Costo mensual | ___ | TBA | ⏳ |
| Analytics OK | ✓ | ✓ | ⏳ |
| SEO indexing | ✓ | ✓ | ⏳ |

---

## 🆘 Rollback Rápido

Si algo falla **durante cualquier fase**,:

1. **Identificar problema:**
   - Error 5xx masivo → Vercel logs.
   - Redirects rotos → Test rutas legacy.
   - Notion timeout → Revisar vars env.
   - Analytics roto → Console DevTools.

2. **Si es quick-fix (<5 min):**
   - Arreglar variable de env en Vercel.
   - Restart deployment (botón en Vercel UI).
   - Retest.

3. **Si es critical (>5 min para arreglar):**
   - **Revertir DNS a Netlify:**
     ```bash
     # En tu DNS provider, cambiar registros de vuelta a Netlify IPs
     # O restaurar nameservers anteriores
     ```
   - Esperar propagación (~5-15 min).
   - Verificar que `patttterns.com` responde desde Netlify.
   - Abrir GitHub Issue con:
     - Qué salió mal.
     - Logs de error.
     - Próximos pasos para fix.
   - Reprogamar cutover cuando problem esté resuelto.

---

## 📝 Notas Operacionales

- **Apagar debuggers antes de cutover:** `NOTION_API_DEBUG=0` y `NOTION_API_STATS=0` en Vercel env para no contaminar logs.
- **Mantener .env.local sincronizado** con Vercel env vars para future changes.
- **Verificar que Netlify.toml no se sincroniza a Vercel** (Vercel lee next.config.ts, no netlify.toml).
- **Timeouts de Notion:** Si ves timeouts durante prime-time, considerar aumentar `NOTION_FETCH_TIMEOUT_MS` en Vercel.

---

**Última Actualización:** Viernes, 23 Marzo 2026

---

## 🔐 Próximo: Identity & Persistence

Ver [ROADMAP_SOCIAL_LOGINS.md](ROADMAP_SOCIAL_LOGINS.md) para el plan detallado de Social Login, Cloud Sync y Plan Pro.

