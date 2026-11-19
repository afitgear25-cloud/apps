import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { actualizar, useDB, useUsuario } from '../data/store'
import type { DB, EstadoAsistencia, Jugador } from '../data/types'
import {
  aptoVencido, disponible, equipoBase, equipoPorId, jugadoresDeEquipo, nombreCompleto, nombreEquipo, porcentajeAsistencia,
} from '../data/logic'
import { veEquipo } from '../lib/permisos'
import { DIAS, fechaLarga, hoy, uid } from '../lib/util'
import { exportar } from '../lib/excel'
import { Boton, Chip, Foto, Pestanas, Tarjeta, Titulo, Vacio } from '../components/ui'
import { CanchaSVG } from '../components/CanchaSVG'
import { FilaEvento } from '../components/Eventos'

type Tab = 'plantel' | 'asistencia' | 'materiales' | 'cancha' | 'agenda'

export function EquipoPage() {
  const { id = '' } = useParams()
  const [sp, setSp] = useSearchParams()
  const db = useDB()
  const u = useUsuario()
  const e = equipoPorId(db, id)
  if (!e || !veEquipo(u, id)) return <Vacio>No tenés acceso a este equipo.</Vacio>
  const tab = (sp.get('tab') as Tab) || 'plantel'
  const jugadores = jugadoresDeEquipo(db, id)
  return (
    <>
      {u?.rol === 'coordinacion' && <Link to={`/plantel/${e.divisionId}`} className="text-sm text-tenue hover:text-white">← {db.divisiones.find((d) => d.id === e.divisionId)?.nombre}</Link>}
      <Titulo sub={`${jugadores.length} jugadores · asistencia ${porcentajeAsistencia(db, id) ?? '—'}${porcentajeAsistencia(db, id) === null ? '' : '%'}`}>{nombreEquipo(db, id)}</Titulo>
      <Pestanas<Tab>
        valor={tab}
        onChange={(t) => setSp({ tab: t }, { replace: true })}
        opciones={[
          { id: 'plantel', texto: `Plantel (${jugadores.length})` },
          { id: 'asistencia', texto: 'Asistencia' },
          { id: 'materiales', texto: 'Materiales' },
          { id: 'cancha', texto: 'Cancha' },
          { id: 'agenda', texto: 'Agenda' },
        ]}
      />
      {tab === 'plantel' && <Plantel db={db} equipoId={id} jugadores={jugadores} editar={u?.rol === 'coordinacion'} />}
      {tab === 'asistencia' && <AsistenciaTab db={db} equipoId={id} jugadores={jugadores} />}
      {tab === 'materiales' && <MaterialesEquipo db={db} equipoId={id} />}
      {tab === 'cancha' && <CanchaEquipo db={db} equipoId={id} />}
      {tab === 'agenda' && <AgendaEquipo db={db} equipoId={id} />}
    </>
  )
}

function edad(nac: string) {
  const n = new Date(nac + 'T12:00')
  const h = new Date()
  let a = h.getFullYear() - n.getFullYear()
  if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) a--
  return a
}

function Plantel({ db, equipoId, jugadores, editar }: { db: DB; equipoId: string; jugadores: Jugador[]; editar: boolean }) {
  const [agregar, setAgregar] = useState('')
  const f = hoy()
  const candidatos = db.jugadores
    .filter((j) => j.activo && !jugadores.includes(j))
    .sort((a, b) => b.nacimiento.localeCompare(a.nacimiento))
  return (
    <>
      {editar && (
        <Tarjeta className="mb-4">
          <label>Sumar un jugador de otra categoría a este equipo (por ejemplo, un 2007 que juega en 2006, o un juvenil que sube a Primera)</label>
          <div className="flex gap-2">
            <select value={agregar} onChange={(e) => setAgregar(e.target.value)}>
              <option value="">Elegí un jugador…</option>
              {candidatos.map((j) => {
                const b = equipoBase(db, j)
                return <option key={j.id} value={j.id}>{nombreCompleto(j)} — {b ? nombreEquipo(db, b) : j.nacimiento.slice(0, 4)}</option>
              })}
            </select>
            <Boton disabled={!agregar} onClick={() => {
              actualizar((d) => { d.jugadores.find((x) => x.id === agregar)!.equiposExtra.push(equipoId) }, `Sumó jugador a ${nombreEquipo(db, equipoId)}`)
              setAgregar('')
            }}>Sumar</Boton>
          </div>
        </Tarjeta>
      )}
      {!jugadores.length && <Vacio>No hay jugadores en este equipo.</Vacio>}
      <div className="grid sm:grid-cols-2 gap-2">
        {jugadores.map((j, i) => {
          const base = equipoBase(db, j)
          const deOtra = base !== equipoId
          const pct = porcentajeAsistencia(db, equipoId, j.id)
          return (
            <div key={j.id} className="flex items-center gap-3 bg-panel border border-borde rounded-xl p-2.5">
              <span className="text-tenue w-6 text-right text-sm">{i + 1}</span>
              <Foto src={j.foto} alt={nombreCompleto(j)} className="w-10 h-10 rounded-full" />
              <div className="min-w-0 flex-1">
                {editar ? <Link to={`/jugadores/${j.id}`} className="font-semibold hover:text-rojo-claro">{nombreCompleto(j)}</Link> : <div className="font-semibold">{nombreCompleto(j)}</div>}
                <div className="text-xs text-tenue flex flex-wrap gap-1.5 items-center">
                  <span>{edad(j.nacimiento)} años · {j.nacimiento.slice(0, 4)}</span>
                  {pct !== null && <span>· {pct}% asist.</span>}
                  {deOtra && <Chip tono="blanco">de {base ? nombreEquipo(db, base) : '—'}</Chip>}
                  {aptoVencido(j, f) && <Chip tono="amarillo">Apto vencido</Chip>}
                </div>
              </div>
              {editar && deOtra && (
                <button className="text-tenue hover:text-rojo-claro text-sm px-2" title="Quitar de este equipo"
                  onClick={() => actualizar((d) => { const x = d.jugadores.find((y) => y.id === j.id)!; x.equiposExtra = x.equiposExtra.filter((q) => q !== equipoId) }, `Quitó jugador de ${nombreEquipo(db, equipoId)}`)}>
                  Quitar
                </button>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

const MOTIVOS = ['Enfermedad', 'Lesión', 'Viaje', 'Estudio', 'Otro']

function AsistenciaTab({ db, equipoId, jugadores }: { db: DB; equipoId: string; jugadores: Jugador[] }) {
  const [fecha, setFecha] = useState(hoy())
  return (
    <>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label htmlFor="fecha">Fecha</label>
          <input id="fecha" type="date" value={fecha} max={hoy()} onChange={(e) => e.target.value && setFecha(e.target.value)} className="w-auto" />
        </div>
        <div className="text-tenue pb-2">{fechaLarga(fecha)}</div>
        <Boton v="oscuro" className="ml-auto" onClick={() => exportar.asistencia(db, equipoId)}>Bajar Excel</Boton>
      </div>
      {/* Si otra persona guarda esta misma planilla, se vuelve a mostrar con sus datos. */}
      <Planilla key={`${equipoId}|${fecha}|${versionPlanilla(db, equipoId, fecha)}`} db={db} equipoId={equipoId} fecha={fecha} jugadores={jugadores} />
      <Historial db={db} equipoId={equipoId} jugadores={jugadores} onElegir={setFecha} />
    </>
  )
}

function versionPlanilla(db: DB, equipoId: string, fecha: string) {
  const a = db.asistencias.find((x) => x.id === `${equipoId}|${fecha}`)
  return a ? `${a.por}|${JSON.stringify(a.registros)}` : ''
}

function Planilla({ db, equipoId, fecha, jugadores }: { db: DB; equipoId: string; fecha: string; jugadores: Jugador[] }) {
  const id = `${equipoId}|${fecha}`
  const existente = db.asistencias.find((a) => a.id === id)
  const [reg, setReg] = useState<Record<string, { estado: EstadoAsistencia; motivo?: string }>>(() =>
    Object.fromEntries(jugadores.map((j) => [j.id, existente?.registros[j.id] ?? { estado: 'P' as const }])),
  )
  const [guardado, setGuardado] = useState(!!existente)
  const u = useUsuario()!
  const set = (jid: string, estado: EstadoAsistencia, motivo?: string) => {
    setReg((r) => ({ ...r, [jid]: { estado, motivo: estado === 'J' ? motivo ?? r[jid]?.motivo : undefined } }))
    setGuardado(false)
  }
  const cuenta = (e: EstadoAsistencia) => Object.values(reg).filter((r) => r.estado === e).length

  const guardar = () => {
    actualizar((d) => {
      d.asistencias = d.asistencias.filter((a) => a.id !== id)
      d.asistencias.push({ id, equipoId, fecha, registros: reg, por: u.nombre })
    }, `Asistencia ${nombreEquipo(db, equipoId)} ${fecha}: ${cuenta('P')} presentes, ${cuenta('A')} ausentes, ${cuenta('J')} justificados`)
    setGuardado(true)
  }

  if (!jugadores.length) return <Vacio>No hay jugadores en este equipo.</Vacio>
  return (
    <Tarjeta className="mb-6 p-0! overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-borde bg-panel-2">
        <Chip tono="verde">✔ {cuenta('P')} presentes</Chip>
        <Chip tono="rojo">✘ {cuenta('A')} ausentes</Chip>
        <Chip tono="amarillo">⚑ {cuenta('J')} justificados</Chip>
        <button className="ml-auto text-sm text-tenue hover:text-white" onClick={() => { setReg(Object.fromEntries(jugadores.map((j) => [j.id, { estado: 'P' as const }]))); setGuardado(false) }}>Todos presentes</button>
      </div>
      <ul className="divide-y divide-borde">
        {jugadores.map((j) => {
          const r = reg[j.id] ?? { estado: 'P' }
          return (
            <li key={j.id} className="px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 font-semibold truncate">{nombreCompleto(j)}</div>
                <div className="flex gap-1.5 shrink-0" role="radiogroup" aria-label={nombreCompleto(j)}>
                  <BotonEstado activo={r.estado === 'P'} color="bg-emerald-600" onClick={() => set(j.id, 'P')} texto="✔" titulo="Presente" />
                  <BotonEstado activo={r.estado === 'A'} color="bg-rojo" onClick={() => set(j.id, 'A')} texto="✘" titulo="Ausente" />
                  <BotonEstado activo={r.estado === 'J'} color="bg-amber-500" onClick={() => set(j.id, 'J', r.motivo ?? 'Enfermedad')} texto="⚑" titulo="Justificado" />
                </div>
              </div>
              {r.estado === 'J' && (
                <div className="flex flex-wrap gap-1.5 mt-2 justify-end">
                  {MOTIVOS.map((m) => (
                    <button key={m} onClick={() => set(j.id, 'J', m)} className={`text-xs px-2.5 py-1 rounded-full border ${r.motivo === m ? 'bg-amber-500 border-amber-500 text-negro font-bold' : 'border-borde text-tenue'}`}>{m}</button>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <div className="sticky bottom-0 bg-panel border-t border-borde p-3 flex items-center gap-3">
        <span className="text-sm text-tenue flex-1">{guardado ? (existente ? `Guardada por ${db.asistencias.find((a) => a.id === id)?.por}` : 'Guardada') : 'Sin guardar'}</span>
        <Boton grande onClick={guardar} disabled={guardado}>{existente ? 'Guardar cambios' : 'Guardar asistencia'}</Boton>
      </div>
    </Tarjeta>
  )
}

function BotonEstado({ activo, color, onClick, texto, titulo }: { activo: boolean; color: string; onClick: () => void; texto: string; titulo: string }) {
  return (
    <button role="radio" aria-checked={activo} title={titulo} aria-label={titulo} onClick={onClick}
      className={`w-11 h-11 rounded-xl text-lg font-black border transition ${activo ? `${color} border-transparent text-white` : 'bg-panel-2 border-borde text-zinc-500'}`}>
      {texto}
    </button>
  )
}

function Historial({ db, equipoId, jugadores, onElegir }: { db: DB; equipoId: string; jugadores: Jugador[]; onElegir: (f: string) => void }) {
  const sesiones = db.asistencias.filter((a) => a.equipoId === equipoId).sort((a, b) => b.fecha.localeCompare(a.fecha))
  const porJugador = useMemo(() => jugadores.map((j) => ({ j, pct: porcentajeAsistencia(db, equipoId, j.id) })).sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101)), [db, equipoId, jugadores])
  if (!sesiones.length) return null
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Tarjeta>
        <h3 className="font-bold mb-2">Entrenamientos tomados</h3>
        <ul className="divide-y divide-borde text-sm">
          {sesiones.slice(0, 20).map((s) => {
            const v = Object.values(s.registros)
            return (
              <li key={s.id}>
                <button className="w-full py-2 flex justify-between hover:text-rojo-claro" onClick={() => onElegir(s.fecha)}>
                  <span>{fechaLarga(s.fecha)}</span>
                  <span className="text-tenue">{v.filter((r) => r.estado === 'P').length}/{v.length} presentes</span>
                </button>
              </li>
            )
          })}
        </ul>
      </Tarjeta>
      <Tarjeta>
        <h3 className="font-bold mb-2">Asistencia por jugador</h3>
        <ul className="divide-y divide-borde text-sm max-h-80 overflow-y-auto">
          {porJugador.map(({ j, pct }) => (
            <li key={j.id} className="py-1.5 flex items-center gap-3">
              <span className="flex-1 truncate">{nombreCompleto(j)}</span>
              <div className="w-24 h-2 bg-panel-2 rounded overflow-hidden"><div className={`h-full ${pct !== null && pct < 60 ? 'bg-rojo' : 'bg-white'}`} style={{ width: `${pct ?? 0}%` }} /></div>
              <span className="w-10 text-right text-tenue">{pct ?? '—'}{pct !== null && '%'}</span>
            </li>
          ))}
        </ul>
      </Tarjeta>
    </div>
  )
}

function MaterialesEquipo({ db, equipoId }: { db: DB; equipoId: string }) {
  const u = useUsuario()!
  const [cant, setCant] = useState<Record<string, number>>({})
  const activos = db.prestamos.filter((p) => p.equipoId === equipoId && !p.devuelto)
  return (
    <>
      {activos.length > 0 && (
        <Tarjeta className="mb-4">
          <h3 className="font-bold mb-2">Lo que tiene este equipo ahora</h3>
          <ul className="divide-y divide-borde">
            {activos.map((p) => {
              const m = db.materiales.find((x) => x.id === p.materialId)
              return (
                <li key={p.id} className="py-2 flex items-center gap-3">
                  <Foto src={m?.foto} alt={m?.nombre ?? ''} className="w-10 h-10 rounded-lg" />
                  <span className="flex-1"><b>{p.cantidad}</b> × {m?.nombre} <span className="text-xs text-tenue">desde {p.fecha.split('-').reverse().join('/')}</span></span>
                  <Boton v="blanco" onClick={() => actualizar((d) => { d.prestamos.find((x) => x.id === p.id)!.devuelto = hoy() }, `Devolvió ${p.cantidad} ${m?.nombre} (${nombreEquipo(db, equipoId)})`)}>Devolver</Boton>
                </li>
              )
            })}
          </ul>
        </Tarjeta>
      )}
      <h3 className="font-bold mb-2">Retirar materiales</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {db.materiales.map((m) => {
          const disp = disponible(db, m.id)
          const n = Math.min(cant[m.id] ?? 1, disp)
          return (
            <Tarjeta key={m.id} className="p-3! flex flex-col gap-2">
              <Foto src={m.foto} alt={m.nombre} className="w-full aspect-[4/3] rounded-xl" />
              <div className="font-semibold leading-tight">{m.nombre}</div>
              <div className="text-xs text-tenue">{disp} disponibles de {m.total}</div>
              <div className="flex items-center gap-1">
                <Boton v="oscuro" className="px-3!" disabled={n <= 1} onClick={() => setCant((c) => ({ ...c, [m.id]: n - 1 }))}>−</Boton>
                <span className="flex-1 text-center font-bold text-lg">{disp ? n : 0}</span>
                <Boton v="oscuro" className="px-3!" disabled={n >= disp} onClick={() => setCant((c) => ({ ...c, [m.id]: n + 1 }))}>+</Boton>
              </div>
              <Boton disabled={!disp} onClick={() => {
                actualizar((d) => { d.prestamos.push({ id: uid(), materialId: m.id, equipoId, cantidad: n, fecha: hoy(), por: u.nombre }) }, `Retiró ${n} ${m.nombre} (${nombreEquipo(db, equipoId)})`)
                setCant((c) => ({ ...c, [m.id]: 1 }))
              }}>Retirar {disp ? n : ''}</Boton>
            </Tarjeta>
          )
        })}
      </div>
    </>
  )
}

function CanchaEquipo({ db, equipoId }: { db: DB; equipoId: string }) {
  const turnos = db.asignaciones.filter((a) => a.equipoId === equipoId).sort((a, b) => a.dia - b.dia || a.desde.localeCompare(b.desde))
  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <p className="text-tenue text-sm">Dónde entrena este equipo cada semana.</p>
        <Link to="/canchas" className="text-sm text-rojo-claro">Organizar canchas →</Link>
      </div>
      {!turnos.length && <Vacio>Este equipo no tiene lugar asignado en las canchas.</Vacio>}
      <div className="grid md:grid-cols-2 gap-4">
        {turnos.map((a) => {
          const c = db.canchas.find((x) => x.id === a.canchaId)!
          const otros = db.asignaciones.filter((b) => b.canchaId === a.canchaId && b.dia === a.dia && b.desde < a.hasta && a.desde < b.hasta)
          const ocup: Record<string, { texto: string; color: string }[]> = {}
          for (const b of otros) for (const z of b.zonas) (ocup[z] ??= []).push({ texto: b.equipoId === equipoId ? 'ACÁ' : nombreEquipo(db, b.equipoId).split(' ').pop()!, color: b.equipoId === equipoId ? '#c8102e' : '#3f3f46' })
          return (
            <Tarjeta key={a.id}>
              <div className="font-bold">{DIAS[a.dia]} · {a.desde} a {a.hasta}</div>
              <div className="text-sm text-tenue mb-2">{c.nombre} · {a.zonas.map((z) => c.zonas.find((x) => x.id === z)?.nombre).join(' + ')}</div>
              <CanchaSVG cancha={c} ocupacion={ocup} />
            </Tarjeta>
          )
        })}
      </div>
    </>
  )
}

function AgendaEquipo({ db, equipoId }: { db: DB; equipoId: string }) {
  const f = hoy()
  const evs = db.eventos.filter((e) => e.equipos.includes(equipoId)).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
  const prox = evs.filter((e) => e.fecha >= f)
  const pasados = evs.filter((e) => e.fecha < f).reverse()
  return (
    <>
      {!evs.length && <Vacio>No hay actividades cargadas para este equipo.</Vacio>}
      {prox.length > 0 && <h3 className="font-bold mb-2">Próximas</h3>}
      <div className="flex flex-col gap-2 mb-5">{prox.map((e) => <FilaEvento key={e.id} db={db} e={e} />)}</div>
      {pasados.length > 0 && <h3 className="font-bold mb-2 text-tenue">Anteriores</h3>}
      <div className="flex flex-col gap-2 opacity-70">{pasados.slice(0, 20).map((e) => <FilaEvento key={e.id} db={db} e={e} />)}</div>
    </>
  )
}

