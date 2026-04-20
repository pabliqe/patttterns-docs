# Guía de Deployment - PATTTTERNS

**Plataforma:** Vercel  
**Framework:** Next.js 14+  
**Última Actualización:** Marzo 24, 2026

---

## Quick Start

### Prerequisitos

- Node.js 18+ (recomendado: 20 LTS)
- Git
- Acceso a Vercel (https://vercel.com)
- Crédenciales de Notion API

### Variables de Entorno Requeridas

```bash
# Notion API
NOTION_API_KEY=ntn_xxxxx                           # Token de Notion API
NOTION_HOMEPAGE_ID=84b89b2059f54c58882c69613e003099
NOTION_UX_PATTERNS=b0b42a6bb3784d2d9f63715402428995
NOTION_UI_PATTERNS=4b5061ca621648c4baab6686d7ad6264
NOTION_ALL_PATTERNS_DATABASE_ID=e642abc6cc7b43e1a2eef35a0e0ccbae
NOTION_TOKEN=v03:xxxxx                             # Opcional, solo para páginas no públicas

# Analytics
NEXT_PUBLIC_GA_ID=G-K1F96PRZNS

# Notion Fetch (tuning opcional)
NOTION_FETCH_RETRY_ATTEMPTS=5           # Reintentos en 429/5xx
NOTION_FETCH_BASE_DELAY_MS=500          # Delay inicial (ms)
NOTION_FETCH_MAX_DELAY_MS=8000          # Delay máximo (ms)
NOTION_FETCH_TIMEOUT_MS=30000           # Timeout global (ms)
NOTION_FAIL_FAST=0                       # 1=sin reintentos, 0=backoff exponencial

# Debugging (solo local o preview)
NOTION_API_DEBUG=0                       # 1 = verbose logs de Notion API
NOTION_API_STATS=0                       # 1 = resumen de stats por endpoint
NOTION_COVER_DEBUG=0                     # 1 = debug pipeline de covers
```

---

## Flujo de Deployment

### 1. Desarrollo Local

```bash
# Clonar repositorio
git clone https://github.com/pabliqe/patttterns-next.git
cd patttterns-next

# Instalar dependencias
npm ci

# Copiar variables de entorno (crear .env.local con valores reales)
cp .env.example .env.local
# Editar .env.local con tokens de Notion y GA ID

# Ejecutar servidor de desarrollo
npm run dev
# Abre http://localhost:3000
```

### 2. Pre-deploy Checks

Antes de pushear a `main`:

```bash
# Build local (simula producción)
npm run build

# Lint + Type Check
npm run lint
npx tsc --noEmit

# Prueba de sitemap/search-index
npm run build:search

# Opcional: Prueba de validación E2E
npm run test:e2e  # si existe
```

### 3. Conexión a Vercel

#### 3.1 Primera Conexión (desde Dashboard)

1. Ve a https://vercel.com/new
2. Selecciona "Import Git Repository"
3. Conecta GitHub y selecciona `patttterns-next`
4. Vercel auto-detectará Next.js framework, deja settings por defecto:
   - **Build Command:** `npm ci && npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm ci`

#### 3.2 Configurar Variables de Entorno en Vercel

En Vercel Dashboard → Project Settings → Environment Variables:

1. Copia todas las variables de `NOTION_API_KEY` a `NOTION_FAIL_FAST` (ver tabla arriba).
2. **Aplicar a:** Production + Preview
3. **Guardar y redeploy**

**⚠️ Security:** Nunca commitees tokens a Git. Vercel las cifrará en tránsito y en reposo.

### 4. Deployment a Producción

#### 4.1 Automatic (Recomendado)

Cada push a `main` dispara deploy automático:

```bash
git add .
git commit -m "feat: description of changes"
git push origin main
# Vercel detecta push → inicia build automáticamente
```

Monitorea en: https://vercel.com/patttterns-pablo/patttterns-next

#### 4.2 Manual (si necesitas)

En Vercel Dashboard → Deployments → "Deploy" (botón manual)

O via CLI:

```bash
npm i -g vercel
vercel --prod
```

### 5. Post-Deployment Validation

Después de cada deploy:

```bash
# (1) Validar DNS
nslookup patttterns.com
# Debe retornar: 76.76.19.165 o similar (Vercel IP)

# (2) Validar rutas críticas
curl -I https://patttterns.com/
curl -I https://patttterns.com/patterns
curl -I https://patttterns.com/sitemap.xml
curl -I https://patttterns.com/robots.txt
curl -I https://patttterns.com/llms.txt
# Todos deben ser 200

# (3) Validar redirect legacy
curl -I https://patttterns.com/pattern/old-slug
# Debe ser 308 (redirect)

# (4) Verificar logs en Vercel
# Dashboard → Deployments → [latest] → Logs
# Buscar: [notion-api] markers o errores 5xx
```

---

## Configuración de Dominio

### Dominio Principal: patttterns.com

**Registrador:** (tu provider: GoDaddy, Namecheap, etc)

1. En Vercel Dashboard → Project Settings → Domains
2. Añadir dominio: `patttterns.com`
3. Copiar nameservers que Vercel propone
4. En tu registrador:
   - Cambiar NS a los de Vercel
   - TTL recomendado: 3600 segundos (1 hora)
5. Verificar:
   ```bash
   dig patttterns.com @8.8.8.8
   # Debe resolver a Vercel
   ```

---

## Monitoreo Post-Deployment

### Vercel Analytics (incluido)

Dashboard → Analytics

- **Latencia:** p50, p75, p99
- **Tráfico:** Páginas/día, usuarios únicos
- **Errores:** 4xx, 5xx por ruta

### Speed Insights (Free en Vercel)

Dashboard → Speed Insights

- Core Web Vitals (LCP, FID, CLS)
- Real User Monitoring (RUM)

### Google Analytics

- GA ID: `G-K1F96PRZNS`
- Verificar llegan eventos: `save_pattern`, views, etc.

### Notion API Observabilidad

En local con `NOTION_API_STATS=1`:

```bash
npm run dev  # con NOTION_API_STATS=1 en .env.local
# Console output:
# [notion-api][summary] queryDatabase {
#   calls: 45,
#   ok: 43,
#   failures: 2,
#   retries: 8,
#   timeouts: 0,
#   avgMs: 380,
#   maxMs: 850,
#   lastError: "408 Request Timeout"
# }
```

En producción (Vercel Logs):

```bash
# Dashboard → Deployments → [latest] → Logs
# Buscar: [notion-api][summary]
```

---

## Troubleshooting

### ❌ Deploy falla en build

```
Error: Failed to load Notion page
```

**Solución:**

1. Verifica `NOTION_API_KEY` en Vercel env vars (no está vacío, válido).
2. Testa localmente: `npm run build` con `.env.local` poblado.
3. Si sigue: mira Vercel build logs → endpoint exacto que falla → reintenta después (Notion rate-limit).

### ❌ Latencia alta después de deploy

```
p99 latencia > 3000ms
```

**Solución:**

1. Revisa Notion API stats en logs (¿timeouts? ¿retries masivos?).
2. Si hay 429 (rate-limit): aumenta `NOTION_FETCH_MAX_DELAY_MS` a 10000.
3. Si hay 5xx de Notion: espera 5-10 min, suele ser transitorio.

### ❌ Rutas 404 inesperadas

```
GET /patterns/some-slug → 404
```

**Solución:**

1. Verifica que slug está en `public/search-index.json` (correr `npm run build:search`).
2. Verifica caché de Edge Caching en Vercel: puede retrasar cambios 60s.

### ❌ Variables de entorno no aplican

```
process.env.NOTION_API_KEY is undefined in production
```

**Solución:**

1. En Vercel: Environment Variables → verifica que están en "Production" + "Preview".
2. Redeploy: Dashboard → Deployments → [latest] → Redeploy.
3. Si sigue: borra variable, guarda, vuelve a crear (flush du cache).

---

## Performance Tuning

### Caching

**Next.js ISR (Incremental Static Regeneration):**

```typescript
// src/app/[type]/page.tsx
export const revalidate = 3600;  // Re-fetch cada 1h
```

Aumentar si cambios de Notion son raros:

```typescript
export const revalidate = 86400;  // 24h
```

**Vercel Edge Caching:**

Headers automáticos en `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: "/sitemap.xml",
      headers: [
        { key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400" }
      ]
    }
  ];
}
```

### Notion API Tuning

Si ves timeouts:

```env
NOTION_FETCH_TIMEOUT_MS=45000       # Subir a 45s
NOTION_FETCH_MAX_DELAY_MS=12000     # Subir a 12s
```

Si ves rate-limits (429):

```env
NOTION_FETCH_RETRY_ATTEMPTS=7       # Más reintentos (default: 5)
NOTION_FETCH_BASE_DELAY_MS=1000     # Delay inicial más alto
```

---

## Rollback Rápido

Si algo sale mal en producción:

### Paso 1: Identificar

```bash
# En Vercel Dashboard → Deployments
# Busca deployment anterior que estaba working
```

### Paso 2: Redeploy anterior

```bash
# Dashboard → Deployments → [working_deployment] → tres puntos → Redeploy
```

O manualmente:

```bash
git revert HEAD
git push origin main
# Vercel re-dispara build con commit anterior
```

### Paso 3: Revertir DNS si es crítico

```bash
# Si patttterns.com es 5xx y no se recupera en 5 min:
# En tu registrador DNS, cambiar NS de vuelta a Netlify
# (mantén en standby 1 semana por eso)
```

---

## Release Checklist

Antes de cada push a producción:

- [ ] Build local sin errores: `npm run build`
- [ ] Lint pasa: `npm run lint`
- [ ] Search index actualizado: `npm run build:search`
- [ ] Variables de env correctas en `.env.local`
- [ ] Tested rutas críticas localmente
- [ ] Commit message descriptivo
- [ ] Push a `main` o rama, abre PR si necesario
- [ ] Monitorea Vercel deployment por 10 min post-push
- [ ] Valida https://patttterns.com carga sin 5xx
- [ ] Verifica Search Console para indexing warnings

---

## Contacts & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Notion API:** https://developers.notion.com
- **Soporte:** webmaster@patttterns.com

---

**Última Actualización:** 24 Marzo 2026  
**Próxima Revisión:** Cuando migres a nueva plataforma
netlify logs --prod
```

### Error: "Module not found"

**Solución:**
```bash
# Limpiar cache
rm -rf .next node_modules
npm install
npm run build
```

### Error: "Notion API error"

**Solución:**
1. Verificar que las env vars estén en Netlify
2. Verificar que la Notion integration tenga acceso a la página
3. Re-deploy: `netlify deploy --prod`

### Página en blanco

**Solución:**
1. Check browser console (F12)
2. Verificar que `NOTION_HOMEPAGE_ID` sea correcto
3. Verificar que la página de Notion esté compartida con tu integration

---

## 📊 Monitoreo Post-Deploy

### Analytics

Agregar en `netlify.toml`:
```toml
[build.environment]
  NEXT_PUBLIC_GOOGLE_ANALYTICS = "G-XXXXXXXXXX"
```

### Notificaciones

En Netlify:
1. Settings → Build & deploy → Deploy notifications
2. Agregar Slack, Email, etc.

---

## 🎯 Próximos Pasos

### Optimizaciones Recomendadas

1. **Lighthouse Audit**
   ```bash
   npx lighthouse https://tu-sitio.netlify.app
   ```

2. **Sitemap**
   - Netlify lo genera automáticamente
   - Verificar en: https://tu-sitio.netlify.app/sitemap.xml

3. **Webhooks de Notion** (opcional)
   - Para rebuild cuando cambias Notion
   - Netlify → Build hooks → Create build hook
   - Copiar URL
   - En Notion API, configurar webhook

---

## 📝 Variables de Entorno en Netlify

```bash
# Ver todas
netlify env:list

# Agregar nueva
netlify env:set KEY value

# Eliminar
netlify env:unset KEY
```

---

## ✅ Deploy Exitoso!

Tu sitio debería estar en:
- **Netlify URL:** https://tu-sitio.netlify.app
- **Custom Domain:** https://patttterns.com (después de configurar DNS)

**¿Problemas?** Revisa:
- https://answers.netlify.com
- Logs en Netlify dashboard
- `netlify logs` en terminal
