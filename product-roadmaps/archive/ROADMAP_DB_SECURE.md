---
title: ✅ DB Secure (Pre-Prod)
parent: Archive
---

# ROADMAP DB Secure (Pre-Prod)

Status: Complete with final environment-separation work still tracked separately.

## Objective

Reduce cross-user data risk, retire legacy schema exposure, and move toward clean environment separation.

## Key Findings

- bookmark access depended heavily on RLS correctness
- delete flows needed explicit owner scoping for defense in depth
- legacy Prisma/NextAuth tables remained exposed alongside active Supabase tables
- public grants were broader than needed
- prod/preview/local separation was incomplete

## Completed Stages

### Stage 1 — Immediate hardening
- added explicit user scoping to bookmark list/delete/clear flows
- audited and remediated grants
- enabled and verified RLS on active tables
- removed dangerous web-role privileges

### Stage 2 — Policy normalization
- cleaned duplicate and overly broad policies
- separated owner and public-shared access paths clearly

### Stage 3 — Legacy retirement
- backup created for legacy tables
- legacy tables renamed and frozen
- final drop tracked after observation period

## Remaining Area

### Stage 4 — Environment separation
- separate Supabase projects or equivalent isolation for prod, preview, and local
- isolate env vars by deployment context

## Validation Highlights

- two-user tests confirmed no cross-user bookmark access
- policy audit completed
- grants reduced to minimum required privileges