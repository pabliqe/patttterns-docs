# 🎨 Guía de Customización del Sitio

Esta guía explica cómo personalizar tu sitio de forma rápida y sencilla.

---

## 📋 Configuración General del Sitio

### Archivo: `site.config.ts` (raíz del proyecto)

Edita este archivo para cambiar la información básica del sitio:

```typescript
export const siteConfig = {
  // Información básica
  name: "Patttterns",                              // Nombre del sitio
  title: "Patttterns - Design Pattern Library",   // Título (SEO)
  description: "A collection of design patterns",  // Descripción (SEO)
  
  // URL del sitio
  url: "https://patttterns.com",
  
  // Notion
  notionPageId: process.env.NOTION_HOMEPAGE_ID,   // ID de página de Notion
  
  // SEO
  keywords: ["design patterns", "UI patterns"],   // Keywords para SEO
  author: "Patttterns",                           // Autor del sitio
  
  // Redes sociales
  social: {
    twitter: "@patttterns",
    github: "patttterns",
  }
};
```

**Cambios comunes:**

```typescript
// Cambiar título del sitio
title: "Mi Portfolio de Diseño"
```

---

## 🎨 Customización Visual (CSS)

### Archivo: `src/app/theme.css`

Edita este archivo para cambiar colores, fuentes, y estilos visuales.

### 1️⃣ Cambiar Colores

```css
:root {
  /* Color principal del sitio */
  --color-primary: #3b82f6;        /* Azul (actual) */
  --color-primary-hover: #2563eb;  /* Azul oscuro al hover */
  
  /* Color secundario */
  --color-secondary: #8b5cf6;      /* Violeta */
  
  /* Colores de fondo */
  --color-background: #ffffff;     /* Blanco */
  --color-surface: #f9fafb;        /* Gris claro */
}
```

**Ejemplos de paletas:**

```css
/* Paleta Verde */
--color-primary: #10b981;
--color-primary-hover: #059669;
--color-secondary: #6ee7b7;

/* Paleta Naranja */
--color-primary: #f59e0b;
--color-primary-hover: #d97706;
--color-secondary: #fbbf24;

/* Paleta Oscura */
--color-primary: #1f2937;
--color-primary-hover: #111827;
--color-background: #f9fafb;
```

### 2️⃣ Cambiar Fuentes

```css
:root {
  /* Fuente del sitio */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  
  /* Fuente para código */
  --font-mono: "Fira Code", "Courier New", monospace;
}
```

**Para usar Google Fonts:**

1. Agrega en `src/app/layout.tsx`:
```typescript
import { Inter, Roboto_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
```

2. En `theme.css`:
```css
--font-sans: 'Inter', sans-serif;
```

### 3️⃣ Ajustar Tamaños de Fuente

```css
:root {
  --font-size-base: 1rem;     /* Tamaño base (16px) */
  --font-size-lg: 1.125rem;   /* Grande (18px) */
  --font-size-xl: 1.25rem;    /* Extra grande (20px) */
}
```

### 4️⃣ Cambiar Bordes y Sombras

```css
:root {
  /* Bordes redondeados */
  --border-radius-md: 0.5rem;   /* 8px */
  --border-radius-lg: 0.75rem;  /* 12px */
  
  /* Sombras */
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

### 5️⃣ Agregar Logo (Imagen)

1. Pon tu logo en `/public/logo.png`

2. Descomenta en `theme.css`:
```css
:root {
  --logo-url: url('/logo.png');
  --logo-width: 120px;
  --logo-height: 40px;
}

.site-logo {
  background-image: var(--logo-url);
  background-size: contain;
  background-repeat: no-repeat;
  width: var(--logo-width);
  height: var(--logo-height);
}
```

---

## 🚀 Aplicar Cambios

Después de editar los archivos:

```bash
# Si el servidor está corriendo, los cambios se aplican automáticamente
# Si no, reinicia el servidor:
npm run dev
```

---

## 📦 Estructura de Archivos

```
patttterns/
├── site.config.ts              ← Configuración del sitio
├── src/
│   └── app/
│       ├── theme.css          ← Estilos y colores
│       ├── globals.css        ← CSS global (importa theme.css)
│       └── layout.tsx         ← Layout principal (usa site.config)
```

---

## 💡 Ejemplos Rápidos

### Cambiar a tema oscuro
```css
:root {
  --color-background: #111827;
  --color-text-primary: #f9fafb;
  --color-surface: #1f2937;
}
```

### Cambiar tamaño del contenedor
```css
:root {
  --max-width-container: 1280px;  /* Más ancho */
  --max-width-container: 960px;   /* Más estrecho */
}
```

### Cambiar color de links en Notion
```css
.notion-link {
  color: #10b981 !important;  /* Verde */
}
```

---

## ❓ Preguntas Frecuentes

**¿Dónde cambio el título de la página?**
→ `site.config.ts` → `title`

**¿Cómo cambio el color principal?**
→ `src/app/theme.css` → `--color-primary`

**¿Cómo agrego mi logo?**
→ Sube a `/public/logo.png` y edita `theme.css`

**¿Los cambios se aplican automáticamente?**
→ Sí, si `npm run dev` está corriendo

---

¡Listo! Con estos dos archivos puedes customizar todo el sitio sin tocar el código complejo.
