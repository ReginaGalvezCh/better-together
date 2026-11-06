# Better Together — public portfolio demo

**Live demo:** https://better-together-ui-demo.regina-galve-9336.chatgpt.site

This is a standalone, read-only React + TypeScript walkthrough of Better Together's original flow: choose a concert date, choose the ticket sector, open the concert home, then visit Inicio, Pulso, and Ayuda. Inicio includes the BTS Santiago 2026 sector diagram and the general Parque Estadio Nacional arrival guide. The data files in `src/` are snapshots of `../lib/sectors.ts` and `../lib/arrival-guide.ts`, kept with the demo so it can build independently.

The concerts have passed. The demo does not connect to the original app's request, moderation, database, queue, or account features. Pulso and Ayuda show archival explanations, not live posts or invented requests. The demo never asks for a ticket upload or precise location and must not be used as live event guidance.

## Run locally

Requires Node.js 22.13+ and npm.

```bash
cd portfolio-demo
npm ci
npm run dev
npm run build
```

## Objective checks

1. The first step lists the three original concert dates. **Continuar** is unavailable until a date is selected; the second step requires one of the 16 ticket sectors before **Ver mi concierto** is available. **Atrás** returns to the date step.
2. Completing setup opens the selected date and sector in the concert view. **Cambiar mi entrada** returns to setup with both selections intact.
3. Inicio renders 16 sectors. Selecting one changes its `aria-pressed` state and the current Help filter; **Ver todos** clears that filter without changing the ticket sector.
4. Inicio renders three general park approaches. Selecting each updates its pressed state, title, transit reference, and note. The map and arrival guide retain distinct source links and do not imply a ticket-specific gate or route.
5. The Inicio, Pulso, and Ayuda navigation works. Pulso and Ayuda explicitly show archival states and never present fabricated live posts or accept requests.
6. Controls work by keyboard and show visible focus. At 390 px and 1440 px widths, the document has no horizontal overflow. No cursor overlay appears in the UI or its captures.
