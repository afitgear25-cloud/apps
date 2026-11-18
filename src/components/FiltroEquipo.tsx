import type { DB } from '../data/types'

export function FiltroEquipo({ db, valor, onChange, sinPrimera }: { db: DB; valor: string; onChange: (v: string) => void; sinPrimera?: boolean }) {
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)}>
      <option value="">Todas las categorías</option>
      {[...db.divisiones].filter((d) => !sinPrimera || !d.esPrimera).sort((a, b) => a.orden - b.orden).map((d) => (
        <optgroup key={d.id} label={d.nombre}>
          <option value={d.id}>{d.nombre} (todas)</option>
          {d.anios.map((a) => <option key={a} value={`${d.id}-${a}`}>{d.nombre} {a}</option>)}
        </optgroup>
      ))}
    </select>
  )
}

/** Coincide si el equipo base es el elegido o pertenece a la división elegida. */
export const coincide = (filtro: string, equipoId?: string) => !filtro || (!!equipoId && (equipoId === filtro || equipoId.startsWith(filtro + '-')))
