import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { actualizar, useDB } from '../data/store'
import type { Jugador } from '../data/types'
import { aptoVencido, equipoBase, equipos, equiposDeJugador, mesesAdeudados, nombreCompleto, nombreEquipo } from '../data/logic'
import { hoy, mesActual, uid } from '../lib/util'
import { Boton, Campo, Chip, Foto, FotoInput, Modal, Tarjeta, Titulo, Vacio } from '../components/ui'
import { bajarPlanillaModelo, leerJugadores } from '../lib/importar'

export function Jugadores() {
  const db = useDB()
  const [q, setQ] = useState('')
  const [div, setDiv] = useState('')
  const [verBajas, setVerBajas] = useState(false)
  const [importado, setImportado] = useState<Awaited<ReturnType<typeof leerJugadores>> | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const f = hoy()
  const lista = db.jugadores
    .filter((j) => j.activo !== verBajas)
    .filter((j) => !div || equiposDeJugador(db, j).some((e) => e === div || e.startsWith(div + '-')))
    .filter((j) => !q || `${j.apellido} ${j.nombre} ${j.dni}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.apellido.localeCompare(b.apellido))
  return (
    <>
      <Titulo sub={`${lista.length} jugadores`} extra={<>
        <input ref={archivo} type="file" accept=".xlsx" className="hidden" onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          try { setImportado(await leerJugadores(file, db.jugadores)) } catch (err) { console.error(err); setImportado({ nuevos: [], errores: ['No se pudo leer el archivo. Tiene que ser un Excel (.xlsx).'] }) }
        }} />
        <Boton v="oscuro" onClick={() => archivo.current?.click()}>Importar Excel</Boton>
        <Link to="/jugadores/nuevo"><Boton>+ Nuevo jugador</Boton></Link>
      </>}>Jugadores</Titulo>
      <div className="grid sm:grid-cols-3 gap-2 mb-4">
        <input placeholder="Buscar por nombre o DNI…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={div} onChange={(e) => setDiv(e.target.value)}>
          <option value="">Todas las categorías</option>
          {[...db.divisiones].sort((a, b) => a.orden - b.orden).map((d) => (
            <optgroup key={d.id} label={d.nombre}>
              <option value={d.id}>{d.nombre} (todas)</option>
              {d.anios.map((a) => <option key={a} value={`${d.id}-${a}`}>{d.nombre} {a}</option>)}
            </optgroup>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-white m-0"><input type="checkbox" checked={verBajas} onChange={(e) => setVerBajas(e.target.checked)} /> Ver jugadores dados de baja</label>
      </div>
      {!lista.length && <Vacio>{db.jugadores.length ? 'No hay jugadores con ese filtro.' : <>Todavía no hay jugadores. Cargalos de a uno con “+ Nuevo jugador” o todos juntos con “Importar Excel”.<br /><button className="text-rojo-claro underline mt-2" onClick={() => void bajarPlanillaModelo()}>Bajar planilla modelo</button></>}</Vacio>}
      {importado && (
        <Modal titulo="Importar jugadores" onClose={() => setImportado(null)}>
          <p className="mb-2"><b className="text-2xl">{importado.nuevos.length}</b> jugadores listos para cargar.</p>
          {importado.nuevos.length > 0 && (
            <ul className="text-sm text-tenue max-h-40 overflow-y-auto mb-3">
              {importado.nuevos.slice(0, 100).map((j) => {
                const b = equipoBase(db, j)
                return <li key={j.id}>{nombreCompleto(j)} · {b ? nombreEquipo(db, b) : `${j.nacimiento.slice(0, 4)} (sin categoría)`}</li>
              })}
            </ul>
          )}
          {importado.errores.length > 0 && (
            <div className="text-sm text-amber-300 max-h-40 overflow-y-auto mb-3">
              <b>No se cargan ({importado.errores.length}):</b>
              <ul>{importado.errores.slice(0, 50).map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
          <div className="flex gap-2">
            <Boton grande className="flex-1" disabled={!importado.nuevos.length} onClick={() => {
              const nuevos = importado.nuevos
              actualizar((d) => { d.jugadores.push(...nuevos) }, `Importó ${nuevos.length} jugadores desde Excel`)
              setImportado(null)
            }}>Cargar {importado.nuevos.length}</Boton>
            <Boton grande v="oscuro" onClick={() => void bajarPlanillaModelo()}>Planilla modelo</Boton>
          </div>
        </Modal>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {lista.map((j) => {
          const base = equipoBase(db, j)
          const deuda = mesesAdeudados(db, j).filter((m) => m < mesActual()).length
          return (
            <Link key={j.id} to={`/jugadores/${j.id}`} className="flex items-center gap-3 bg-panel border border-borde hover:border-rojo rounded-xl p-2.5">
              <Foto src={j.foto} alt={nombreCompleto(j)} className="w-11 h-11 rounded-full" />
              <div className="min-w-0">
                <div className="font-semibold truncate">{nombreCompleto(j)}</div>
                <div className="text-xs text-tenue flex flex-wrap gap-1 items-center">
                  {base ? nombreEquipo(db, base) : 'Sin categoría'}
                  {j.equiposExtra.length > 0 && <Chip>+{j.equiposExtra.length} equipo{j.equiposExtra.length > 1 ? 's' : ''}</Chip>}
                  {aptoVencido(j, f) && <Chip tono="amarillo">Apto</Chip>}
                  {deuda > 0 && <Chip tono="rojo">Debe {deuda}</Chip>}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}

const VACIO: Jugador = { id: '', nombre: '', apellido: '', dni: '', nacimiento: '', alta: mesActual(), fichaLiga: '', aptoVence: '', obs: '', activo: true, equiposExtra: [] }

export function JugadorForm() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const db = useDB()
  const existente = db.jugadores.find((j) => j.id === id)
  const [j, setJ] = useState<Jugador>(() => structuredClone(existente ?? VACIO))
  if (id !== 'nuevo' && !existente) return <Vacio>Jugador no encontrado.</Vacio>
  const set = <K extends keyof Jugador>(k: K, v: Jugador[K]) => setJ((x) => ({ ...x, [k]: v }))
  const baseAuto = equipoBase(db, { ...j, equipoBase: undefined })
  const base = j.equipoBase || baseAuto
  const valido = j.nombre.trim() && j.apellido.trim() && /^\d{4}-\d{2}-\d{2}$/.test(j.nacimiento)

  const guardar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valido) return
    const nuevo = { ...j, id: j.id || uid(), nombre: j.nombre.trim(), apellido: j.apellido.trim(), equiposExtra: j.equiposExtra.filter((x) => x !== base) }
    actualizar((d) => {
      d.jugadores = existente ? d.jugadores.map((x) => (x.id === nuevo.id ? nuevo : x)) : [...d.jugadores, nuevo]
    }, `${existente ? 'Editó' : 'Agregó'} jugador ${nombreCompleto(nuevo)}`)
    nav(-1)
  }

  return (
    <form onSubmit={guardar} className="max-w-3xl">
      <button type="button" onClick={() => nav(-1)} className="text-sm text-tenue hover:text-white">← Volver</button>
      <Titulo>{existente ? nombreCompleto(existente) : 'Nuevo jugador'}</Titulo>
      <Tarjeta className="mb-4">
        <div className="mb-4"><FotoInput carpeta="jugadores" valor={j.foto} onChange={(v) => set('foto', v)} /></div>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Campo label="Nombre *"><input value={j.nombre} onChange={(e) => set('nombre', e.target.value)} required /></Campo>
          <Campo label="Apellido *"><input value={j.apellido} onChange={(e) => set('apellido', e.target.value)} required /></Campo>
          <Campo label="Fecha de nacimiento *"><input type="date" value={j.nacimiento} onChange={(e) => set('nacimiento', e.target.value)} required /></Campo>
          <Campo label="DNI"><input inputMode="numeric" value={j.dni} onChange={(e) => set('dni', e.target.value.replace(/\D/g, ''))} /></Campo>
          <Campo label="N° de ficha (liga / AFA)"><input value={j.fichaLiga} onChange={(e) => set('fichaLiga', e.target.value)} /></Campo>
          <Campo label="Apto médico vence"><input type="date" value={j.aptoVence} onChange={(e) => set('aptoVence', e.target.value)} /></Campo>
          <Campo label="Paga cuota desde (mes)"><input type="month" value={j.alta} onChange={(e) => e.target.value && set('alta', e.target.value)} /></Campo>
          <Campo label="Estado">
            <select value={j.activo ? '1' : '0'} onChange={(e) => set('activo', e.target.value === '1')}>
              <option value="1">Activo</option>
              <option value="0">Dado de baja</option>
            </select>
          </Campo>
        </div>
        <Campo label="Observaciones"><textarea rows={2} value={j.obs} onChange={(e) => set('obs', e.target.value)} /></Campo>
      </Tarjeta>

      <Tarjeta className="mb-4">
        <h2 className="font-bold mb-1">Categoría y equipos</h2>
        <p className="text-sm text-tenue mb-3">
          Por año de nacimiento le corresponde: <b className="text-white">{baseAuto ? nombreEquipo(db, baseAuto) : '—'}</b>
        </p>
        <Campo label="Categoría base">
          <select value={j.equipoBase ?? ''} onChange={(e) => set('equipoBase', e.target.value || undefined)}>
            <option value="">Automática según año de nacimiento</option>
            {equipos(db).map((e) => <option key={e.id} value={e.id}>{nombreEquipo(db, e.id)}</option>)}
          </select>
        </Campo>
        <label>También juega en (tocá para marcar)</label>
        <div className="flex flex-wrap gap-1.5">
          {equipos(db).filter((e) => e.id !== base).map((e) => {
            const on = j.equiposExtra.includes(e.id)
            return (
              <button type="button" key={e.id} onClick={() => set('equiposExtra', on ? j.equiposExtra.filter((x) => x !== e.id) : [...j.equiposExtra, e.id])}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold ${on ? 'bg-rojo border-rojo' : 'border-borde text-tenue'}`}>
                {nombreEquipo(db, e.id)}
              </button>
            )
          })}
        </div>
      </Tarjeta>

      <div className="flex gap-2 sticky bottom-3">
        <Boton grande type="submit" disabled={!valido}>Guardar</Boton>
        <Boton grande type="button" v="oscuro" onClick={() => nav(-1)}>Cancelar</Boton>
      </div>
    </form>
  )
}
