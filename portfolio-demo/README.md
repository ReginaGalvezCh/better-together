# Better Together — public portfolio demo

This is a standalone, read-only React + TypeScript demonstration of two UI interactions from Better Together: the BTS Santiago 2026 sector diagram and the general Parque Estadio Nacional arrival guide. It reuses the source data in `../lib/sectors.ts` and `../lib/arrival-guide.ts`.

The concerts have passed. The demo does not connect to the original app's request, moderation, database, queue, or account features. It never asks for a ticket or precise location and must not be used as live event guidance.

## Run locally

Requires Node.js 22.13+ and npm.

```bash
cd portfolio-demo
npm ci
npm run dev
npm run build
```

## Objective checks

1. The **Mapa de sectores** tab renders 16 sectors. Selecting one changes its `aria-pressed` state and the current-selection label. **Ver todos** clears the selection.
2. The **Cómo llegar** tab renders three general approaches. Selecting each updates its pressed state, title, transit reference, and note.
3. Both views link separately to the published venue or event sources and state that the diagrams do not confirm a ticket-specific gate or route.
4. All buttons can be reached and activated by keyboard and show visible focus.
5. At 390 px and 1440 px widths, the document has no horizontal overflow. No cursor overlay appears in the UI or its captures.
