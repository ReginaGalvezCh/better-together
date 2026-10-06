# Better Together

PWA anónima y *offline-first* para que fans puedan cuidarse, coordinar puntos seguros y pedir ayuda durante eventos concurridos.

## MVP

- Alertas de emergencia, seguridad, salud, personas perdidas, suministros y avisos.
- Zonas aproximadas en vez de ubicación exacta.
- Cola local cuando no hay señal y sincronización al reconectar.
- Caducidad automática de alertas.
- Métricas agregadas sin perfiles personales.
- Interfaz móvil, accesible y preparada para uso con una mano.

## Desarrollo

Requiere Node.js 22.13 o superior.

```bash
npm install
npm run db:generate
npm run dev
```

Para la base local, genera primero el build y aplica la migración indicada en `drizzle/` siguiendo la guía del starter.

## Documentación

- [Arquitectura](./ARCHITECTURE.md)
- [Contribuir](./CONTRIBUTING.md)
- [Seguridad](./SECURITY.md)

## Alcance de seguridad

Better Together complementa la coordinación comunitaria; no reemplaza al personal del recinto ni a los servicios de emergencia.

