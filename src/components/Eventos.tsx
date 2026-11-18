import type { DB, Evento } from '../data/types'
import { nombreEquipo } from '../data/logic'
import { fechaLarga } from '../lib/util'
import { Chip } from './ui'

export const TIPOS: Record<Evento['tipo'], string> = {
  partido: 'Partido',
  entrenamiento: 'Entrenamiento especial',
  torneo: 'Torneo',
  reunion: 'Reunión',
  otro: 'Otro',
}

export function tituloEvento(db: DB, e: Evento) {
  if (e.tipo === 'partido') return `${e.equipos.map((x) => nombreEquipo(db, x)).join(' / ')} vs ${e.rival || 'a definir'}`
  return e.titulo || TIPOS[e.tipo]
}

export function FilaEvento({ db, e, conFecha = true, onClick }: { db: DB; e: Evento; conFecha?: boolean; onClick?: () => void }) {
  const finde = [0, 6].includes(new Date(e.fecha + 'T12:00').getDay())
  return (
    <button onClick={onClick} disabled={!onClick} className="w-full text-left flex gap-3 items-start bg-panel-2 border border-borde rounded-xl p-3 hover:border-rojo disabled:hover:border-borde">
      <div className={`w-1.5 self-stretch rounded ${e.tipo === 'partido' ? 'bg-rojo' : 'bg-white/60'}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-tenue mb-0.5">
          {conFecha && <span className={finde ? 'text-rojo-claro font-semibold' : ''}>{fechaLarga(e.fecha)}</span>}
          <span>{e.hora}{e.horaFin ? `–${e.horaFin}` : ''}</span>
          <Chip tono={e.tipo === 'partido' ? 'rojo' : 'gris'}>{TIPOS[e.tipo]}</Chip>
          {e.tipo === 'partido' && <Chip tono={e.condicion === 'local' ? 'blanco' : 'gris'}>{e.condicion === 'local' ? 'Local' : e.condicion === 'visitante' ? 'Visitante' : 'Neutral'}</Chip>}
        </div>
        <div className="font-semibold">{tituloEvento(db, e)}</div>
        {e.tipo !== 'partido' && e.equipos.length > 0 && <div className="text-sm text-tenue">{e.equipos.map((x) => nombreEquipo(db, x)).join(', ')}</div>}
        {(e.lugar || e.notas) && <div className="text-sm text-tenue">{[e.lugar, e.notas].filter(Boolean).join(' · ')}</div>}
      </div>
    </button>
  )
}
