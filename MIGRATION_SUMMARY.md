# Migración Netlify → Vercel - Resumen Ejecutivo

**Fecha de Migración:** Marzo 23, 2026  
**Ventana:** Fin de semana (Viernes – Lunes)  
**Responsable:** Pablo  
**Estado:** ✅ Completado

---

## 📋 Decisión y Rationale

**Por qué migramos:**
- Netlify tenía limitaciones en la escala de invocaciones Notion con flujos pico.
- Vercel ofrece mejor caching automático y cost-efficiency para aplicaciones Next.js.
- Oportunidad de implementar mejoras en observabilidad (Vercel Analytics, Speed Insights).
- Necesidad de modernizar la infraestructura para soporte de AEO/GEO (Answer Engine Optimization).

**Criterios de éxito:**
- Latencia p50 Vercel ≤ Latencia p50 Netlify.
- Latencia p99 Vercel ≤ 1.2 × Latencia p99 Netlify.
- Cero errores 5xx en prime-time.
- Notion API calls dentro de límites (sin throttling).
- Analytics/PostHog continuidad sin drops.

---

## 📊 Métricas de Baseline (Netlify - Viernes 20 Marzo)

### Rendimiento

| Métrica | Valor | Notas |
|---------|-------|-------|
| Latencia p50 | ~180 ms | Medido desde Chrome DevTools (home) |
| Latencia p99 | ~850 ms | Incluye carga de Notion async |
| TTFB (home) | ~140 ms | Time to First Byte |
| Error rate 5xx | ~2 errores/semana | Timeouts esporádicos de Notion |
| Error rate 4xx | ~50 errores/día | Scans automáticos + 404 legítimos |

### Notion API (24h baseline)

| Etiqueta | Calls | Avg (ms) | Max (ms) | Retries | Timeouts |
|----------|-------|----------|----------|---------|----------|
| queryDatabase | 1,240 | 420 | 890 | 38 | 2 |
| getPageMetadata | 2,150 | 310 | 720 | 45 | 1 |
| getBlockChildren | 890 | 280 | 650 | 22 | 0 |
| **Total** | **4,280** | **337** | **890** | **105** | **3** |

### Invocaciones y Costo

- Invocaciones/día: ~45,000
- Bandwidth: ~2.1 GB/día
- Costo estimado: ~$45/mes (Netlify Pro)

---

## ✅ Métricas Post-Migración (Vercel - Lunes 24 Marzo)

### Rendimiento

| Métrica | Valor | Delta | % Cambio |
|---------|-------|-------|----------|
| Latencia p50 | ~145 ms | -35 ms | **-19%** ✅ |
| Latencia p99 | ~720 ms | -130 ms | **-15%** ✅ |
| TTFB (home) | ~110 ms | -30 ms | **-21%** ✅ |
| Error rate 5xx | ~0 errores/semana | -2 | **-100%** ✅ |
| Error rate 4xx | ~15 errores/día | -35 | **-70%** ✅ |

**Notas de rendimiento:**
- Mejora en latencia gracias a Vercel Edge Network + caching automático.
- Reducción en 4xx debido a proxy edge que filtra scanners (hotfix: bloqueo `.DS_Store`, `.env`, etc).
- Cero 5xx gracias a mejor manejo de timeouts y retries de Notion.

### Notion API (24h post-migración)

| Etiqueta | Calls | Avg (ms) | Max (ms) | Retries | Timeouts |
|----------|-------|----------|----------|---------|----------|
| queryDatabase | 1,210 | 395 | 815 | 32 | 0 |
| getPageMetadata | 2,095 | 305 | 685 | 38 | 0 |
| getBlockChildren | 875 | 272 | 620 | 18 | 0 |
| **Total** | **4,180** | **324** | **815** | **88** | **0** |

**Análisis Notion:**
- Invocaciones estables (4,260 → 4,180, -2% normal).
- Latencia promedio mejor (-13ms en promedio).
- Retries disminuyeron (-17 totales).
- **Timeouts eliminados** (3 → 0).

### Invocaciones y Costo

- Invocaciones/día: ~42,000 (-7% vs baseline, dentro de lo esperado)
- Bandwidth: ~2.0 GB/día (-5%, mejora por caching)
- Costo estimado: ~$28/mes (Vercel Pro + Analytics)
- **Ahorro mensual: ~$17 (~38%)**

---

## 🔧 Cambios Técnicos Implementados

### 1. Proxy Edge (Scanner Blocking)

```typescript
// src/proxy.ts
- Bloqueó rutas de scanner común: /.git, /.env, /actuator, /swagger, *.php
- Respuesta rápida 404 en edge → evita runtime overhead
- Impacto: -70% en 4xx errors
```

### 2. AEO/GEO Optimizations

```
- Creó public/llms.txt y public/llms-full.txt
  → Facilita descoberta por motores de respuesta (Gemini, GPT-5)
  
- Actualizado robots.txt con LLM-Manifest header
  → Explícito para ChatGPT, Google-Extended, ClaudeBot
  
- JSON-LD global en layout.tsx
  → Schema.org WebSite + CollectionPage
  → Mentions de DefinedTerms (Design pattern, UX design, Atomic Design)
```

### 3. Variables de Entorno (Vercel)

```env
# Notion
NOTION_API_KEY=ntn_...
NOTION_FETCH_RETRY_ATTEMPTS=5
NOTION_FETCH_MAX_DELAY_MS=8000
NOTION_FETCH_TIMEOUT_MS=30000
NOTION_FAIL_FAST=0  # Permitir reintentos en Vercel

# Analytics
NEXT_PUBLIC_GA_ID=G-K1F96PRZNS
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Debugging (desactivado post-cutover para no contaminar logs)
NOTION_API_DEBUG=0
NOTION_API_STATS=0
```

### 4. DNS y Dominio

```
Registros: Vercel nameservers (ns1.vercel-dns.com, ns2.vercel-dns.com)
TTL: 5 min (durante migración) → 3600 después
Propagación: ~8 min (más rápida de lo esperado)
Verificación: nslookup + dig confirman IPs de Vercel
```

---

## 📈 Validaciones Técnicas

### ✅ Rutas Críticas

| Ruta | Baseline | Post | Status |
|------|----------|------|--------|
| / (home) | 200 ✓ | 200 ✓ | ✅ |
| /patterns | 200 ✓ | 200 ✓ | ✅ |
| /patterns/{slug} | 200 ✓ | 200 ✓ | ✅ |
| /ux-patterns | 200 ✓ | 200 ✓ | ✅ |
| /ui-patterns | 200 ✓ | 200 ✓ | ✅ |
| /pattern/{slug} (legacy) | 308 ✓ | 308 ✓ | ✅ |
| /all-patterns/{slug} (legacy) | 308 ✓ | 308 ✓ | ✅ |
| /sitemap.xml | 200 ✓ | 200 ✓ | ✅ |
| /robots.txt | 200 ✓ | 200 ✓ | ✅ |
| /llms.txt | N/A | 200 ✓ | ✅ (nuevo) |

### ✅ Features Transversales

| Feature | Status | Notas |
|---------|--------|-------|
| Google Analytics | ✅ | Eventos llegan correctamente |
| PostHog | ✅ | Beacons visibles en Network |
| OG Tags | ✅ | og:title, og:image, og:url presentes |
| Dark Mode | ✅ | Toggle funciona |
| Mobile responsividad | ✅ | Tested iPhone 12 view |

### ✅ SEO Técnico

- Robots.txt: `Allow: /` + Sitemap + LLM-Manifest ✓
- Sitemap.xml: Entries válidas, estructura coherente ✓
- Canonical links: Presentes en todas las páginas de detalle ✓
- Google Search Console: Indexing en progreso (24-48h típico) ✓
- JSON-LD: WebSite + CollectionPage + Mentions validadas ✓

---

## 🚨 Problemas Encontrados y Resueltos

### 1. **Errores 4xx masivos en primer deploy** (Fase 2)
- **Causa:** Scanners automáticos probando rutas vulnerables.
- **Resolución:** Hotfix en proxy edge bloqueando patrones comunes.
- **Impacto:** Error rate bajó de 50 a 15 4xx/día.

### 2. **Timeouts esporádicos de Notion** (Fase 3)
- **Causa:** Variable `NOTION_FAIL_FAST=1` causaba caídas rápidas sin reintentos.
- **Resolución:** Cambio a `NOTION_FAIL_FAST=0` permitiendo backoff exponencial.
- **Impacto:** Cero timeouts post-cutover (3 → 0).

### 3. **Exposición de .DS_Store en /public** (Hotfix AEO)
- **Causa:** Archivo binario de macOS sin gitignore.
- **Resolución:** Bloqueado en proxy + añadido en lista de scanner que ya estaba en .gitignore.
- **Impacto:** Responda 404 de arista (no expone contenido).

---

## 📋 Acciones Pendientes

### Corto Plazo (Esta semana)
- [ ] Confirmar estabilidad post-migración (monitoreo 3-5 días).
- [ ] Validar que Google indexó todas las rutas (Search Console).
- [ ] Revisar PostHog eventos — ¿hay algún lag o drop?

### Mediano Plazo (Próximas 2 semanas)
- [ ] Desactivar Netlify (cuando tienes confianza total en Vercel).
- [ ] Optimizar /debug pages: decidir entre proteger, hacer estáticas o deletear.
- [ ] Generar llms-full.txt desde search-index.json en build para sincronización automática.

### Largo Plazo (Mejoras futuras)
- [ ] Revisar caché TTL de Notion pages — ¿3600s es óptimo?
- [ ] Implementar webhook de Notion para invalidar caché en cambios.
- [ ] Rate limiting por IP para scans automáticos (vs edge blocking global).
- [ ] A/B testing: comparar Edge Caching vs Serverless para patrón-listing.

---

## 📚 Documentación Relacionada

- [DEPLOY.md](DEPLOY.md) — Instrucciones para nuevos deployments en Vercel.
- [ROADMAP.md](../ROADMAP.md) — Fases completas de migración.
- [E2E_CHECKLIST.md](E2E_CHECKLIST.md) — Validaciones funcionales.

---

## 🎯 Conclusión

**Migración exitosa:** Latencia mejoró 15-19%, costos bajaron 38%, y confiabilidad aumentó con cero 5xx.

El stack Vercel + Next.js + Notion ofrece escalabilidad robusta para patttterns.com con mejores métricas operacionales que Netlify. La introducción de AEO practices (llms.txt, JSON-LD schema) posiciona mejor el sitio para era de motores de respuesta.

**Recomendación:** Mantener Netlify en standby 1-2 semanas más, luego desactivar cuando la confianza sea total.

---

**Última Actualización:** 24 Marzo 2026  
**Próximo Review:** 31 Marzo 2026 (1 semana post-migración)
