# Contribuir

## Antes de comenzar

1. Crea una rama corta desde `main`.
2. Mantén cada cambio enfocado en una sola intención.
3. Ejecuta `npm run build` antes de abrir un pull request.

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

