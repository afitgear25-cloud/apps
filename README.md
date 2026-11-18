# Gestión del Club

App web (instalable en el celular) para que un club de fútbol gestione plantel, asistencia, cuotas,
ropa, materiales, canchas y calendario, con exportación a Excel.

Diseño: `docs/superpowers/specs/2026-11-18-gestion-club-design.md`

## Usarla

```bash
npm install
npm run dev      # para desarrollo
npm run build    # genera la carpeta dist/ para publicar
```

Usuarios de ejemplo (contraseña `1234`): `coordinador`, `admin`, `martin`, `laura`, `diego`.

## Escudo

Subilo desde **Ajustes → Subir escudo**, o reemplazá `public/escudo.svg`.

## Datos

En esta versión los datos se guardan en el dispositivo (localStorage). Toda la lectura y escritura
pasa por `src/data/store.ts`, que es lo único que hay que cambiar para conectar una base en la nube.
