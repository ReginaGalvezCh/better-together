# Contribuir

## Antes de comenzar

1. Crea una rama corta desde `main`.
2. Mantén cada cambio enfocado en una sola intención.
3. Ejecuta pruebas, lint, revisión de tipos y compilación antes de integrar.

## Un incremento por PR

Cada PR describe un objetivo, el alcance, las pruebas con sus resultados, una
vista previa y los riesgos o pendientes. La vista previa local solo funciona en
el equipo donde corre la app; no debe presentarse como un despliegue compartido.
Incluye una captura de la revisión cuando cambie la interfaz.

```text
npm test
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

Actualiza la rama con main y vuelve a verificar si hubo conflictos. No mezcles
funciones pendientes en el mismo PR. Mantén los Conventional Commits por
incremento; usa un merge revisado para conservarlos en la historia.

Integrar en main no autoriza publicar. El despliegue del sitio requiere un
acuerdo explícito y no debe activar consultas pagadas, fuentes sociales ni
tareas recurrentes por su cuenta. Las pruebas con respuestas simuladas no
demuestran que una API externa esté habilitada.

## Checklist del desarrollo acordado

- [x] Consolidar correcciones y preparación privada de fuentes (PR #7).
- [x] Integrar Qué llevar con las correcciones (PR #8).
- [ ] Moderación básica, en `feat/community-moderation`.
- [ ] Fuentes reales para Pulso, primero con selección editorial autorizada.
- [ ] Entrada y acciones por momento.
- [ ] Radares de freebies/eventos y después baños, comida y merch con fuentes vigentes.
- [ ] Prueba acotada con fans en celulares reales y con poca señal.
- [ ] Música y enlaces a fanchants, después de las capas anteriores.

No marcar un punto como terminado solo porque exista su rama, documentación
o una demostración; la capacidad debe estar implementada y verificada.

## Commits

Usamos una versión breve de Conventional Commits:

- `feat:` nueva capacidad visible.
- `fix:` corrección de comportamiento.
- `docs:` documentación.
- `test:` pruebas.
- `refactor:` mejora interna sin cambiar el comportamiento.
- `chore:` mantenimiento.

Ejemplos:

```text
feat(alerts): queue reports while offline
fix(safety): hide precise location from alert details
docs: explain anonymous analytics
```

Los scopes son opcionales. Evita mezclar refactors con funcionalidades en el mismo commit.
