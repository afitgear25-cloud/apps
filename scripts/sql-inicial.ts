// Genera el SQL con los datos base del club (sin jugadores) a partir del seed de la app.
import { crearSeed } from '../src/data/seed'

const s = crearSeed()
const q = (v: unknown) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`
const filas = (t: string, xs: { id: string }[]) => xs.length ? `insert into public.${t} (id, data) values\n${xs.map((x) => `('${x.id}', ${q(x)})`).join(',\n')};` : ''
console.log([
  `insert into public.config (id, data) values ('club', ${q({ clubNombre: 'Club Atlético', temporada: s.config.temporada })});`,
  filas('divisiones', s.divisiones),
  filas('canchas', s.canchas),
  filas('prendas', s.prendas),
  filas('materiales', s.materiales),
].join('\n'))
