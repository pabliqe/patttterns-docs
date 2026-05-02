---
title: E2E Deploy Checklist
parent: Setup & Configuration
---

# 🎯 Deploy Checklist - Prueba E2E

## ✅ Pre-Deploy (Local)

- [x] **Build exitoso** - `npm run build` completado sin errores
- [x] **Variables de entorno** - `.env.local` configurado correctamente
- [x] **Git inicializado** - Repositorio listo
- [x] **Archivos de configuración** 
  - [x] `netlify.toml` creado
  - [x] `.gitignore` verificado
  - [x] `DEPLOY.md` con instrucciones

## 📋 Comandos Rápidos

### 1. Preparar y Commit
```bash
# Ver estado
git status

# Agregar todo
git add .

# Commit
git commit -m "chore: prepare for Netlify deployment - add netlify.toml, deploy scripts and docs"

# Crear repo en GitHub (manual) y luego:
git remote add origin https://github.com/TU_USUARIO/patttterns.git
git branch -M main
git push -u origin main
```

### 2. Deploy a Netlify via GitHub Sync ⭐
```bash
# En Netlify Web UI:
# 1. Add new site → Import from GitHub
# 2. Seleccionar repo: patttterns
# 3. Configurar:
#    - Branch: main
#    - Build command: npm run build
#    - Publish directory: .next
# 4. Agregar environment variables (copiar de .env.local):
#    - NOTION_API_KEY = secret_XXX... (tu token)
#    - NOTION_HOMEPAGE_ID = XXX... (tu page ID)
# 5. Click "Deploy patttterns"
# 6. Esperar 2-4 minutos
```

**Verificar Deploy:**
- Ve a: https://app.netlify.com/sites/TU-SITIO/deploys
- Status debe ser: "Published"
- Build logs deben mostrar: "Site is live"

## 🧪 Pruebas E2E Post-Deploy

### Test 1: Homepage
```bash
# URL del deploy
export SITE_URL="https://YOUR-SITE.netlify.app"

# Check homepage
curl -I $SITE_URL
# Expected: HTTP 200
```

**Manual Check:**
- [ ] Logo/título visible
- [ ] Bases de datos inline renderizadas
- [ ] Imágenes de cover cargan
- [ ] Iconos visibles
- [ ] Estilos aplicados correctamente

### Test 2: Navegación a Página Individual
**Manual Check:**
- [ ] Click en cualquier patrón
- [ ] Página individual carga
- [ ] Contenido de Notion renderizado
- [ ] Botón "Back" funciona
- [ ] URL amigable (slug correcto)

### Test 3: Imágenes de Notion
**Manual Check:**
- [ ] Cover images cargan desde Notion CDN
- [ ] Imágenes inline visibles
- [ ] No hay errores 403 en console

### Test 4: Performance
```bash
# Lighthouse audit (instalar si no lo tienes)
npm install -g lighthouse

# Run audit
lighthouse $SITE_URL --view
```

**Targets:**
- [ ] Performance: > 80
- [ ] Accessibility: > 90
- [ ] Best Practices: > 90
- [ ] SEO: > 90

### Test 5: Mobile Responsiveness
**Manual Check (Chrome DevTools):**
- [ ] iPhone SE (375x667)
- [ ] iPad (768x1024)
- [ ] Desktop (1920x1080)

### Test 6: Metadata & SEO
```bash
# Check meta tags
curl -s $SITE_URL | grep -i "meta\|title"
```

**Expected:**
- [ ] `<title>` presente
- [ ] `<meta name="description">` presente
- [ ] Open Graph tags presentes
- [ ] Twitter card tags presentes

### Test 7: Todas las Páginas Generadas
```bash
# Verificar en Netlify build logs que todas las rutas se generaron
# Expected: ~21 páginas (homepage + 20 patterns)
```

### Test 8: Error Handling
**Manual Check:**
- [ ] Página inexistente → 404 correcto
- [ ] Error de Notion API → mensaje amigable

## 🐛 Troubleshooting Durante Pruebas

### Problema: Build falla en Netlify
**Debug:**
```bash
# Ver logs
netlify logs

# Comparar con build local
npm run build
```

### Problema: Variables de entorno no funcionan
**Debug:**
1. Verificar en Netlify UI: Site settings → Environment variables
2. Re-deploy después de agregar vars:
```bash
netlify deploy --prod
```

### Problema: Imágenes no cargan
**Debug:**
1. Check browser console (F12)
2. Verificar `next.config.ts` remotePatterns
3. Verificar que Notion integration tenga permisos

### Problema: Página en blanco
**Debug:**
1. Check browser console
2. Verificar `NOTION_HOMEPAGE_ID` en Netlify
3. Verificar que la página de Notion esté compartida

## 📊 Métricas Esperadas

### Build
- **Tiempo:** 2-4 minutos
- **Páginas generadas:** ~21
- **Tamaño bundle:** < 5MB

### Runtime
- **TTFB:** < 600ms
- **FCP:** < 1.8s
- **LCP:** < 2.5s

## ✅ Sign-off

Una vez completadas todas las pruebas:

```bash
# Tag de release
git tag v1.0.0
git push origin v1.0.0

# Documentar en README
echo "🚀 Live at: https://YOUR-SITE.netlify.app" >> README.md
git add README.md
git commit -m "docs: add live site URL"
git push
```

## 🎉 Deploy Exitoso!

Tu sitio está en producción. Próximos pasos opcionales:
- [ ] Configurar custom domain
- [ ] Setup Notion webhooks para rebuild automático
- [ ] Configurar analytics
- [ ] Agregar sitemap a Google Search Console
