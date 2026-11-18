import type { Cancha } from '../data/types'
import { textoSobre } from '../lib/util'

export interface Ocupante {
  texto: string
  color: string
}

/**
 * Dibuja una cancha del predio dividida en sus zonas.
 * Cancha de 11: 3 franjas de fútbol 9 a lo largo. Cancha de 7: 2 de fútbol 5 a lo ancho.
 */
export function CanchaSVG({
  cancha,
  ocupacion = {},
  seleccion = [],
  onZona,
  className = '',
}: {
  cancha: Cancha
  ocupacion?: Record<string, Ocupante[]>
  seleccion?: string[]
  onZona?: (zonaId: string) => void
  className?: string
}) {
  const W = cancha.forma === 'f11' ? 330 : 260
  const H = cancha.forma === 'f11' ? 210 : 170
  const m = 8
  const n = cancha.zonas.length
  const ancho = (W - m * 2) / n
  const area = cancha.forma === 'f11' ? { w: 40, h: 96 } : { w: 28, h: 70 }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`w-full h-auto select-none ${className}`} role="img" aria-label={cancha.nombre}>
      <defs>
        <pattern id={`pasto-${cancha.id}`} width="44" height={H} patternUnits="userSpaceOnUse">
          <rect width="22" height={H} fill="#1f5f2c" />
          <rect x="22" width="22" height={H} fill="#236a31" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={W} height={H} rx="10" fill={`url(#pasto-${cancha.id})`} />
      {/* líneas reglamentarias de la cancha completa */}
      <g stroke="#ffffffaa" strokeWidth="1.5" fill="none">
        <rect x={m} y={m} width={W - m * 2} height={H - m * 2} />
        <line x1={W / 2} y1={m} x2={W / 2} y2={H - m} strokeOpacity={n === 3 ? 0.35 : 1} />
        <circle cx={W / 2} cy={H / 2} r={cancha.forma === 'f11' ? 24 : 18} strokeOpacity={n === 3 ? 0.35 : 1} />
        <rect x={m} y={(H - area.h) / 2} width={area.w} height={area.h} />
        <rect x={W - m - area.w} y={(H - area.h) / 2} width={area.w} height={area.h} />
      </g>
      {cancha.zonas.map((z, i) => {
        const x = m + i * ancho
        const ocup = ocupacion[z.id] ?? []
        const sel = seleccion.includes(z.id)
        const choque = ocup.length > 1 || (sel && ocup.length > 0)
        const color = choque ? '#f59e0b' : ocup[0]?.color
        return (
          <g key={z.id} onClick={onZona ? () => onZona(z.id) : undefined} className={onZona ? 'cursor-pointer' : ''}>
            <rect
              x={x + 2}
              y={m + 2}
              width={ancho - 4}
              height={H - m * 2 - 4}
              rx="6"
              fill={choque ? '#f59e0b' : sel ? '#c8102e' : color ?? 'transparent'}
              fillOpacity={sel || color ? 0.82 : 0}
              stroke={sel ? '#fff' : 'transparent'}
              strokeWidth={sel ? 3 : 0}
            />
            <text x={x + ancho / 2} y={m + 20} textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffffcc">
              {z.nombre.replace('Fútbol ', 'F')}
            </text>
            {(choque ? [{ texto: '⚠ Choque', color: '#f59e0b' }, ...ocup] : sel ? [{ texto: 'Elegida', color: '#c8102e' }] : ocup).slice(0, 3).map((o, k) => (
              <text
                key={k}
                x={x + ancho / 2}
                y={H / 2 + k * 16 - (choque ? 8 : 0)}
                textAnchor="middle"
                fontSize={k === 0 ? 15 : 12}
                fontWeight="800"
                fill={choque ? '#0b0b0c' : sel || color ? textoSobre(sel ? '#c8102e' : color!) : '#fff'}
              >
                {o.texto}
              </text>
            ))}
          </g>
        )
      })}
      {/* redes divisorias */}
      {cancha.zonas.slice(1).map((z, i) => (
        <line key={z.id} x1={m + (i + 1) * ancho} y1={m - 4} x2={m + (i + 1) * ancho} y2={H - m + 4} stroke="#ffffff" strokeWidth="2.5" strokeDasharray="5 4" />
      ))}
    </svg>
  )
}
