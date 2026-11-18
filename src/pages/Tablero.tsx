import { Link } from 'react-router-dom'
import { useDB } from '../data/store'
import { aptoVencido, equipoBase, equipos, equiposDeJugador, mesesAdeudados, nombreCompleto, nombreEquipo, prestado } from '../data/logic'
import { DIAS, hoy, isoFecha, mesActual } from '../lib/util'
import { Dato, Tarjeta, Titulo } from '../components/ui'
import { FilaEvento } from '../components/Eventos'

export function Tablero() {
  const db = useDB()
  const activos = db.jugadores.filter((j) => j.activo)
  const f = hoy()
  const hace30 = isoFecha(new Date(Date.now() - 30 * 864e5))
  let tot = 0, pres = 0
  for (const a of db.asistencias) if (a.fecha >= hace30) for (const r of Object.values(a.registros)) { tot++; if (r.estado === 'P') pres++ }
  const mes = mesActual()
  const pendientesMes = activos.filter((j) => j.alta <= mes && !db.pagos.some((p) => p.jugadorId === j.id && p.mes === mes)).length
  const atrasados = activos.filter((j) => mesesAdeudados(db, j).filter((m) => m < mes).length > 0).length
  const vencidos = activos.filter((j) => aptoVencido(j, f))
  const prestados = db.materiales.reduce((s, m) => s + prestado(db, m.id), 0)
  const en7 = isoFecha(new Date(Date.now() + 7 * 864e5))
  const proximos = db.eventos.filter((e) => e.fecha >= f && e.fecha <= en7).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
  const diaHoy = new Date().getDay()
  const canchasHoy = db.asignaciones.filter((a) => a.dia === diaHoy).sort((a, b) => a.desde.localeCompare(b.desde))

  return (
    <>
      <Titulo sub={`Hoy es ${DIAS[diaHoy].toLowerCase()} · ${f.split('-').reverse().join('/')}`}>Tablero general</Titulo>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Dato rojo valor={activos.length} texto="Jugadores activos" />
        <Dato valor={tot ? `${Math.round((pres / tot) * 100)}%` : '—'} texto="Asistencia últimos 30 días" />
        <Dato valor={pendientesMes} texto={`Cuotas sin pagar este mes`} />
        <Dato valor={atrasados} texto="Jugadores con meses atrasados" />
      </div>

      <h2 className="font-bold mb-3">Divisiones</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[...db.divisiones].sort((a, b) => a.orden - b.orden).map((d) => {
          const eqs = equipos(db).filter((e) => e.divisionId === d.id)
          const cant = activos.filter((j) => equiposDeJugador(db, j).some((e) => e.startsWith(d.id + '-'))).length
          return (
            <Link key={d.id} to={`/plantel/${d.id}`} className="bg-panel border border-borde hover:border-rojo rounded-2xl p-4 transition">
              <div className="text-xs uppercase tracking-widest text-rojo-claro font-bold">{d.nombre}</div>
              <div className="text-3xl font-black mt-1">{cant}</div>
              <div className="text-sm text-tenue">jugadores · {eqs.length} categorías</div>
            </Link>
          )
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Tarjeta>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold">Próximos 7 días</h2>
            <Link to="/calendario" className="text-sm text-rojo-claro">Ver calendario →</Link>
          </div>
          <div className="flex flex-col gap-2">
            {proximos.length ? proximos.map((e) => <FilaEvento key={e.id} db={db} e={e} />) : <p className="text-tenue text-sm">No hay actividades cargadas.</p>}
          </div>
        </Tarjeta>
        <Tarjeta>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold">Canchas hoy</h2>
            <Link to="/canchas" className="text-sm text-rojo-claro">Ver canchas →</Link>
          </div>
          {canchasHoy.length ? (
            <ul className="divide-y divide-borde text-sm">
              {canchasHoy.map((a) => {
                const c = db.canchas.find((x) => x.id === a.canchaId)
                return (
                  <li key={a.id} className="py-2 flex justify-between gap-3">
                    <span className="text-tenue whitespace-nowrap">{a.desde}–{a.hasta}</span>
                    <span className="font-semibold text-right">{nombreEquipo(db, a.equipoId)}</span>
                    <span className="text-tenue text-right">{c?.nombre} · {a.zonas.map((z) => c?.zonas.find((x) => x.id === z)?.nombre.replace('Fútbol ', 'F')).join('+')}</span>
                  </li>
                )
              })}
            </ul>
          ) : <p className="text-tenue text-sm">No hay entrenamientos asignados para hoy.</p>}
        </Tarjeta>
        <Tarjeta>
          <h2 className="font-bold mb-3">Apto médico vencido o sin cargar <span className="text-rojo-claro">({vencidos.length})</span></h2>
          <ul className="text-sm divide-y divide-borde max-h-64 overflow-y-auto">
            {vencidos.slice(0, 50).map((j) => {
              const b = equipoBase(db, j)
              return (
                <li key={j.id} className="py-1.5 flex justify-between">
                  <Link to={`/jugadores/${j.id}`} className="hover:text-rojo-claro">{nombreCompleto(j)}</Link>
                  <span className="text-tenue">{b ? nombreEquipo(db, b) : ''} · {j.aptoVence ? `venció ${j.aptoVence.split('-').reverse().join('/')}` : 'sin cargar'}</span>
                </li>
              )
            })}
            {!vencidos.length && <li className="text-tenue py-1">Todos al día.</li>}
          </ul>
        </Tarjeta>
        <Tarjeta>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold">Materiales</h2>
            <Link to="/materiales" className="text-sm text-rojo-claro">Ver inventario →</Link>
          </div>
          <p className="text-sm text-tenue">{prestados} unidades retiradas por equipos en este momento.</p>
          <ul className="text-sm mt-2 divide-y divide-borde">
            {db.prestamos.filter((p) => !p.devuelto).slice(0, 8).map((p) => (
              <li key={p.id} className="py-1.5 flex justify-between">
                <span>{p.cantidad} × {db.materiales.find((m) => m.id === p.materialId)?.nombre}</span>
                <span className="text-tenue">{nombreEquipo(db, p.equipoId)}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>
    </>
  )
}
