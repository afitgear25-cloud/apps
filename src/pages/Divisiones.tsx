import { Link, useParams } from 'react-router-dom'
import { useDB } from '../data/store'
import { entrenadoresDe, equipoBase, equipos, equiposDeJugador, jugadoresDeEquipo, porcentajeAsistencia } from '../data/logic'
import { Titulo } from '../components/ui'

export function Divisiones() {
  const db = useDB()
  const activos = db.jugadores.filter((j) => j.activo)
  return (
    <>
      <Titulo sub="Elegí una división para ver sus categorías.">Divisiones</Titulo>
      <div className="grid sm:grid-cols-2 gap-4">
        {[...db.divisiones].sort((a, b) => a.orden - b.orden).map((d) => (
          <Link key={d.id} to={`/plantel/${d.id}`} className="bg-panel border border-borde hover:border-rojo rounded-2xl p-5 transition">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black uppercase">{d.nombre}</div>
              <div className="text-rojo-claro font-bold">{activos.filter((j) => equiposDeJugador(db, j).some((e) => e.startsWith(d.id + '-'))).length} jugadores</div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {d.anios.map((a) => <span key={a} className="bg-panel-2 border border-borde rounded-lg px-2.5 py-1 text-sm font-semibold">{a}</span>)}
            </div>
            {d.esPrimera && <p className="text-xs text-tenue mt-3">Se arma con jugadores que ascienden desde Juveniles.</p>}
          </Link>
        ))}
      </div>
    </>
  )
}

export function DivisionDetalle() {
  const { divId } = useParams()
  const db = useDB()
  const d = db.divisiones.find((x) => x.id === divId)
  if (!d) return <p>División no encontrada.</p>
  return (
    <>
      <Link to="/plantel" className="text-sm text-tenue hover:text-white">← Divisiones</Link>
      <Titulo sub="Tocá una categoría para ver plantel, asistencia, materiales y cancha.">{d.nombre}</Titulo>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {equipos(db).filter((e) => e.divisionId === d.id).map((e) => {
          const js = jugadoresDeEquipo(db, e.id)
          const propios = js.filter((j) => equipoBase(db, j) === e.id).length
          const pct = porcentajeAsistencia(db, e.id)
          const ent = entrenadoresDe(db, e.id)
          return (
            <Link key={e.id} to={`/equipo/${e.id}`} className="bg-panel border border-borde hover:border-rojo rounded-2xl p-4 transition">
              <div className="text-3xl font-black">{e.anio}</div>
              <div className="text-rojo-claro font-bold">{js.length} jugadores</div>
              {js.length !== propios && <div className="text-xs text-tenue">{propios} de la categoría + {js.length - propios} de otras</div>}
              <div className="text-xs text-tenue mt-2">Asistencia: {pct ?? '—'}{pct !== null && '%'}</div>
              <div className="text-xs text-tenue truncate">{ent.length ? ent.map((u) => u.nombre).join(', ') : 'Sin entrenador'}</div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
