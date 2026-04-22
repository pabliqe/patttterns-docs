---
title: ✅ DB Secure (Pre-Prod)
parent: Roadmaps
---

# ROADMAP DB Secure (Pre-Prod)

Estado: ✅ Completado
Fecha de inicio: 2026-04-16
Owner: Product/Engineering

## Evidencia reciente (2026-04-16)

Resultado del query de `information_schema.role_table_grants`:
- Todas las tablas en `public` siguen con grants amplios para `anon` y `authenticated`.
- Incluye privilegios de alto riesgo/no necesarios en runtime web: `TRUNCATE`, `TRIGGER`, `REFERENCES`.
- Afecta tanto tablas legacy (`"Account"`, `"Bookmark"`, `"Collection"`, `"Session"`, `"User"`, `"VerificationToken"`) como tablas activas (`bookmarks`, `user_profiles`).

Conclusión operativa:
- Etapa 1 no puede considerarse cerrada todavía.
- Se requiere remediación de grants + validación de RLS/policies antes de mover a prod.

## Objetivo
Eliminar riesgos de fuga de datos entre usuarios, cerrar superficie legacy no utilizada y dejar una arquitectura de base de datos separada por entornos (prod, preview, local).

## Hallazgos críticos

1. Riesgo de lectura cruzada de bookmarks por dependencia fuerte de RLS
- El cliente lista bookmarks sin filtro explícito por user_id y confía en RLS para aislamiento.
- Si RLS/policies están mal configuradas, un usuario puede ver filas ajenas.

2. Riesgo de borrado cruzado de bookmarks
- El cliente eliminaba por pattern_id sin filtro explícito por user_id.
- Si RLS está débil, se puede borrar fuera de alcance del usuario.

3. Doble esquema activo/legacy y tablas duplicadas
- Esquema actual: public.bookmarks + public.user_profiles (Supabase Auth + REST).
- Esquema legacy: tablas Prisma/NextAuth con mayúsculas ("Bookmark", "Collection", "User", "Account", "Session", "VerificationToken").

4. Tablas public con exposición innecesaria
- Tablas legacy visibles como unrestricted elevan riesgo operativo y alertas de seguridad.

5. Un solo proyecto DB para todos los contextos
- Sin separación por entorno, hay riesgo de contaminación de datos y cambios de schema no aislados.

## Etapas

### Etapa 1: Contención y hardening inmediato (COMPLETA)
Objetivo: reducir riesgo hoy, sin esperar limpieza total.

Entregables:
- [x] Defensa en profundidad en cliente para bookmarks:
  - list: filtro user_id explícito
  - delete: filtro user_id + pattern_id
  - clear-all: filtro user_id
- [x] Script SQL de auditoría y lock inicial: docs/DB_SECURITY_STAGE1.sql
- [x] Ejecutar script en proyecto Supabase de producción
- [x] Registrar evidencias (capturas/resultado queries)
- [x] Remediar grants abiertos — DB_SECURITY_STAGE2_REMEDIATE.sql ejecutado: REVOKE ALL → re-grant mínimos (SELECT para anon, CRUD para authenticated)
- [x] Re-ejecutar verificación post-remediación: grants correctos, RLS habilitado, sin TRUNCATE/TRIGGER/REFERENCES para roles web

Implementado en código:
- src/lib/bookmark-cloud.ts

Criterios de salida:
- [x] No hay lecturas ni borrados cruzados aun si hay policy mal configurada.
- [x] RLS habilitado en tablas activas.
- [x] Grants de legacy revocados para anon/authenticated/public.
- [x] Grants en tablas activas limitados a privilegios mínimos necesarios.

### Etapa 2: Normalización de políticas y permisos (COMPLETA)
Objetivo: dejar policies explícitas, mínimas y auditables.

Entregables:
- [x] Revisar y limpiar políticas redundantes/abiertas — policies duplicadas ("Owner access", "Public read shared") eliminadas.
- [x] Políticas separadas por operación: owner_* (CRUD autenticado) + public_*_shared (SELECT anon con share_enabled=true).
- [x] Verificación manual post-ejecución: pg_policies auditadas, sin duplicados, estado limpio confirmado.

### Etapa 3: Congelación y retiro de legacy (EN CURSO — espera 7 días)
Objetivo: sacar tablas legacy sin riesgo.

Entregables:
- [x] Backup lógico de tablas legacy — schema backup_20260416 creado con copia de todas las tablas Prisma/NextAuth.
- [x] Renombrado temporal con prefijo zz_legacy_ en public (freeze aplicado vía DB_LEGACY_DECOMMISSION.sql).
- [ ] Observación por 7 días sin errores — inició 2026-04-16, vence 2026-04-23.
- [ ] Drop definitivo de tablas legacy (Sección C de DB_LEGACY_DECOMMISSION.sql).

### Etapa 4: Separación de entornos DB
Objetivo: aislar prod/preview/local.

Entregables:
- [ ] Proyecto Supabase Prod.
- [ ] Proyecto Supabase Preview/Staging.
- [ ] Supabase local (CLI) o proyecto Dev dedicado.
- [ ] Variables de entorno separadas por contexto en Netlify.

## Tablas objetivo

Mantener (activas):
- public.bookmarks
- public.user_profiles

Retirar (legacy, tras Etapa 3):
- public."Bookmark"
- public."Collection"
- public."User"
- public."Account"
- public."Session"
- public."VerificationToken"

## Riesgos abiertos

- Si existen políticas permissive heredadas (using true), RLS puede no proteger adecuadamente.
- Si preview y prod comparten DB, pruebas de feature pueden impactar datos reales.

## Validación mínima antes de mover a prod

- [x] Prueba con dos usuarios reales distintos (A y B): A no ve ni borra bookmarks de B — validado en sesión de testing 2026-04-17.
- [x] Revisión de pg_policies en todas las tablas public — auditadas, sin duplicados ni policies abiertas.
- [x] Revisión de grants para anon/authenticated/public — grants mínimos confirmados.
- [ ] Confirmar separación de variables por entorno en Netlify (Etapa 4 pendiente).
- [x] Confirmar ausencia de `TRUNCATE`, `TRIGGER` y `REFERENCES` para roles web (`anon`, `authenticated`) — removidos en Etapa 1.
