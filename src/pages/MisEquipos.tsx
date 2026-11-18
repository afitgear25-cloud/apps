import { Link } from 'react-router-dom'
import { useDB, useUsuario } from '../data/store'
import { jugadoresDeEquipo, nombreEquipo, porcentajeAsistencia } from '../data/logic'
import { DIAS_CORTO, hoy } from '../lib/util'
import { Tarjeta, Titulo, Vacio } from '../components/ui'
import { FilaEvento } from '../components/Eventos'

export function MisEquipos() {
  const db = useDB()
  const u = useUsuario()!
  const f = hoy()
  return (
    <>
      <Titulo sub="Tocá un equipo para tomar asistencia, retirar materiales o ver tu lugar en la cancha.">Mis equipos</Titulo>
      {!u.equipos.length && <Vacio>Todavía no tenés equipos asignados. Pedíselo a coordinación.</Vacio>}
      <div className="grid sm:grid-cols-2 gap-4">
        {u.equipos.map((id) => {
          const cant = jugadoresDeEquipo(db, id).length
          const pct = porcentajeAsistencia(db, id)
          const tomadaHoy = db.asistencias.some((a) => a.id === `${id}|${f}`)
          const turnos = db.asignaciones.filter((a) => a.equipoId === id).sort((a, b) => a.dia - b.dia || a.desde.localeCompare(b.desde))
          const prox = db.eventos.filter((e) => e.equipos.includes(id) && e.fecha >= f).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0]
          return (
            <Tarjeta key={id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xl font-black">{nombreEquipo(db, id)}</div>
                  <div className="text-sm text-tenue">{cant} jugadores · asistencia {pct ?? '—'}{pct !== null ? '%' : ''}</div>
                </div>
                <Link to={`/equipo/${id}?tab=asistencia`} className={`px-3 py-2 rounded-xl text-sm font-bold ${tomadaHoy ? 'bg-panel-2 border border-borde' : 'bg-rojo'}`}>
                  {tomadaHoy ? '✔ Asistencia de hoy' : 'Tomar asistencia'}
                </Link>
              </div>
              {turnos.length > 0 && (
                <div className="text-sm">
                  <div className="text-tenue mb-1">Cancha</div>
                  {turnos.map((a) => {
                    const c = db.canchas.find((x) => x.id === a.canchaId)
                    return <div key={a.id}>{DIAS_CORTO[a.dia]} {a.desde}–{a.hasta} · {c?.nombre} ({a.zonas.map((z) => c?.zonas.find((x) => x.id === z)?.nombre.replace('Fútbol ', 'F')).join('+')})</div>
                  })}
                </div>
              )}
              {prox && <FilaEvento db={db} e={prox} />}
              <Link to={`/equipo/${id}`} className="text-sm text-rojo-claro">Abrir equipo →</Link>
            </Tarjeta>
          )
        })}
      </div>
    </>
  )
}
