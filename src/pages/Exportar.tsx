import { useState } from 'react'
import { useDB, useUsuario } from '../data/store'
import { exportar } from '../lib/excel'
import { Boton, Titulo } from '../components/ui'

export function Exportar() {
  const db = useDB()
  const u = useUsuario()!
  const [bajando, setBajando] = useState('')
  const opciones: { id: keyof typeof exportar; texto: string; desc: string }[] =
    u.rol === 'coordinacion'
      ? [
          { id: 'todo', texto: 'Todo el club', desc: 'Un archivo con todas las hojas: jugadores, asistencia, cuotas, ropa, materiales, calendario, canchas y registro de cambios.' },
          { id: 'jugadores', texto: 'Jugadores', desc: 'Fichas, categoría y equipos de cada jugador.' },
          { id: 'asistencia', texto: 'Asistencia', desc: 'Cada entrenamiento, jugador por jugador.' },
          { id: 'cuotas', texto: 'Cuotas', desc: 'Pagos por mes y deuda de cada jugador.' },
          { id: 'ropa', texto: 'Ropa', desc: 'Catálogo con precios y estado por jugador.' },
          { id: 'materiales', texto: 'Materiales', desc: 'Inventario y retiros.' },
          { id: 'calendario', texto: 'Calendario', desc: 'Partidos y actividades.' },
          { id: 'canchas', texto: 'Canchas', desc: 'Quién entrena dónde cada día.' },
          { id: 'matriculados', texto: 'Matriculados', desc: 'Cantidad por categoría.' },
        ]
      : [
          { id: 'administracion', texto: 'Todo administración', desc: 'Cuotas, ropa y matriculados en un archivo.' },
          { id: 'cuotas', texto: 'Cuotas', desc: 'Pagos por mes y deuda de cada jugador.' },
          { id: 'ropa', texto: 'Ropa', desc: 'Catálogo con precios y estado por jugador.' },
          { id: 'matriculados', texto: 'Matriculados', desc: 'Cantidad por categoría.' },
        ]
  return (
    <>
      <Titulo sub="Bajá los datos a Excel para tener respaldo o imprimir.">Exportar a Excel</Titulo>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {opciones.map((o, i) => (
          <div key={o.id} className={`rounded-2xl p-4 border flex flex-col gap-2 ${i === 0 ? 'bg-rojo border-rojo' : 'bg-panel border-borde'}`}>
            <div className="font-bold text-lg">{o.texto}</div>
            <p className={`text-sm flex-1 ${i === 0 ? 'text-white/85' : 'text-tenue'}`}>{o.desc}</p>
            <Boton v={i === 0 ? 'blanco' : 'oscuro'} disabled={!!bajando} onClick={async () => {
              setBajando(o.id)
              try { await (exportar[o.id] as (d: typeof db) => Promise<void>)(db) } finally { setBajando('') }
            }}>{bajando === o.id ? 'Preparando…' : 'Bajar .xlsx'}</Boton>
          </div>
        ))}
      </div>
    </>
  )
}
