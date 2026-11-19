import { useState } from 'react'
import { actualizar, useDB, useUsuario } from '../data/store'
import type { DB, Material } from '../data/types'
import { disponible, nombreEquipo, prestado } from '../data/logic'
import { puede } from '../lib/permisos'
import { hoy, uid } from '../lib/util'
import { exportar } from '../lib/excel'
import { Boton, Campo, Foto, FotoInput, Modal, Tarjeta, Titulo, Vacio } from '../components/ui'

export function Materiales() {
  const db = useDB()
  const u = useUsuario()!
  const editar = puede(u, 'materiales-editar')
  const [form, setForm] = useState<Material | null>(null)
  const [retirar, setRetirar] = useState<Material | null>(null)
  const activos = db.prestamos.filter((p) => !p.devuelto && (editar || u.equipos.includes(p.equipoId)))

  return (
    <>
      <Titulo sub="Stock del club con foto de cada material." extra={<>
        {editar && <Boton v="oscuro" onClick={() => exportar.materiales(db)}>Bajar Excel</Boton>}
        {editar && <Boton onClick={() => setForm({ id: '', nombre: '', total: 1, rotos: 0, ubicacion: 'Depósito' })}>+ Nuevo material</Boton>}
      </>}>Materiales</Titulo>

      {!db.materiales.length && <Vacio>Todavía no hay materiales cargados.</Vacio>}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {db.materiales.map((m) => {
          const disp = disponible(db, m.id)
          const pr = prestado(db, m.id)
          return (
            <Tarjeta key={m.id} className="p-3! flex flex-col gap-2">
              <Foto src={m.foto} alt={m.nombre} className="w-full aspect-[4/3] rounded-xl" />
              <div className="font-bold leading-tight">{m.nombre}</div>
              <div className="flex items-baseline gap-1"><span className="text-3xl font-black">{disp}</span><span className="text-sm text-tenue">disponibles</span></div>
              <div className="text-xs text-tenue">{m.total} en total · {pr} retirados · {m.rotos} rotos · {m.ubicacion}</div>
              <div className="h-1.5 bg-panel-2 rounded overflow-hidden flex">
                <div className="bg-white" style={{ width: `${(disp / Math.max(1, m.total)) * 100}%` }} />
                <div className="bg-rojo" style={{ width: `${(pr / Math.max(1, m.total)) * 100}%` }} />
              </div>
              <div className="flex gap-1.5 mt-auto">
                {u.rol === 'entrenador' && <Boton className="flex-1" disabled={!disp || !u.equipos.length} onClick={() => setRetirar(m)}>Retirar</Boton>}
                {editar && <Boton v="oscuro" className="flex-1" onClick={() => setForm(structuredClone(m))}>Editar</Boton>}
              </div>
            </Tarjeta>
          )
        })}
      </div>

      <Tarjeta>
        <h2 className="font-bold mb-2">{editar ? 'Materiales retirados por los equipos' : 'Lo que tienen tus equipos'}</h2>
        {!activos.length && <p className="text-sm text-tenue">No hay materiales retirados.</p>}
        <ul className="divide-y divide-borde">
          {activos.map((p) => {
            const m = db.materiales.find((x) => x.id === p.materialId)
            return (
              <li key={p.id} className="py-2 flex items-center gap-3">
                <Foto src={m?.foto} alt={m?.nombre ?? ''} className="w-10 h-10 rounded-lg" />
                <div className="flex-1 min-w-0">
                  <div><b>{p.cantidad}</b> × {m?.nombre}</div>
                  <div className="text-xs text-tenue">{nombreEquipo(db, p.equipoId)} · {p.fecha.split('-').reverse().join('/')} · {p.por}</div>
                </div>
                <Boton v="blanco" onClick={() => actualizar((d) => { d.prestamos.find((x) => x.id === p.id)!.devuelto = hoy() }, `Devolvió ${p.cantidad} ${m?.nombre} (${nombreEquipo(db, p.equipoId)})`)}>Devolver</Boton>
              </li>
            )
          })}
        </ul>
      </Tarjeta>

      {form && <FormMaterial db={db} inicial={form} onClose={() => setForm(null)} />}
      {retirar && <Retirar db={db} m={retirar} equipos={u.equipos} usuario={u.nombre} onClose={() => setRetirar(null)} />}
    </>
  )
}

function FormMaterial({ db, inicial, onClose }: { db: DB; inicial: Material; onClose: () => void }) {
  const [m, setM] = useState(inicial)
  const set = <K extends keyof Material>(k: K, v: Material[K]) => setM((x) => ({ ...x, [k]: v }))
  const pr = inicial.id ? prestado(db, inicial.id) : 0
  const valido = m.nombre.trim() && m.total >= 0 && m.rotos >= 0 && m.rotos + pr <= m.total
  return (
    <Modal titulo={inicial.id ? 'Editar material' : 'Nuevo material'} onClose={onClose}>
      <div className="mb-4"><FotoInput carpeta="materiales" valor={m.foto} onChange={(v) => set('foto', v)} /></div>
      <Campo label="Nombre"><input value={m.nombre} placeholder="Ej.: Pelotas N°5" onChange={(e) => set('nombre', e.target.value)} /></Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Cantidad total"><input type="number" min={0} inputMode="numeric" value={m.total} onChange={(e) => set('total', Math.max(0, Number(e.target.value)))} /></Campo>
        <Campo label="Rotos / fuera de uso"><input type="number" min={0} inputMode="numeric" value={m.rotos} onChange={(e) => set('rotos', Math.max(0, Number(e.target.value)))} /></Campo>
      </div>
      <Campo label="Dónde se guarda"><input value={m.ubicacion} onChange={(e) => set('ubicacion', e.target.value)} /></Campo>
      {m.rotos + pr > m.total && <p className="text-rojo-claro text-sm">Hay {pr} retirados: el total no puede ser menor a rotos + retirados.</p>}
      <div className="flex gap-2 mt-3">
        <Boton grande className="flex-1" disabled={!valido} onClick={() => {
          const nuevo = { ...m, id: m.id || uid(), nombre: m.nombre.trim() }
          actualizar((d) => { d.materiales = inicial.id ? d.materiales.map((x) => (x.id === nuevo.id ? nuevo : x)) : [...d.materiales, nuevo] }, `${inicial.id ? 'Editó' : 'Agregó'} material ${nuevo.nombre} (total ${nuevo.total}, rotos ${nuevo.rotos})`)
          onClose()
        }}>Guardar</Boton>
        {inicial.id && <Boton grande v="oscuro" disabled={pr > 0} title={pr ? 'Hay unidades retiradas' : ''} onClick={() => {
          if (!confirm(`¿Borrar ${inicial.nombre}?`)) return
          actualizar((d) => { d.materiales = d.materiales.filter((x) => x.id !== inicial.id); d.prestamos = d.prestamos.filter((p) => p.materialId !== inicial.id) }, `Borró material ${inicial.nombre}`)
          onClose()
        }}>Borrar</Boton>}
      </div>
    </Modal>
  )
}

function Retirar({ db, m, equipos, usuario, onClose }: { db: DB; m: Material; equipos: string[]; usuario: string; onClose: () => void }) {
  const disp = disponible(db, m.id)
  const [n, setN] = useState(Math.min(1, disp))
  const [eq, setEq] = useState(equipos[0])
  return (
    <Modal titulo={`Retirar ${m.nombre}`} onClose={onClose}>
      <Foto src={m.foto} alt={m.nombre} className="w-full aspect-[16/9] rounded-xl mb-3" />
      <Campo label="Para el equipo">
        <div className="flex gap-1 flex-wrap">{equipos.map((e) => <button key={e} onClick={() => setEq(e)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${eq === e ? 'bg-rojo border-rojo' : 'border-borde text-tenue'}`}>{nombreEquipo(db, e)}</button>)}</div>
      </Campo>
      <Campo label={`Cantidad (hay ${disp})`}>
        <div className="flex items-center gap-2">
          <Boton v="oscuro" grande disabled={n <= 1} onClick={() => setN(n - 1)}>−</Boton>
          <span className="flex-1 text-center text-3xl font-black">{n}</span>
          <Boton v="oscuro" grande disabled={n >= disp} onClick={() => setN(n + 1)}>+</Boton>
        </div>
      </Campo>
      <Boton grande className="w-full mt-2" disabled={!n} onClick={() => {
        actualizar((d) => { d.prestamos.push({ id: uid(), materialId: m.id, equipoId: eq, cantidad: n, fecha: hoy(), por: usuario }) }, `Retiró ${n} ${m.nombre} (${nombreEquipo(db, eq)})`)
        onClose()
      }}>Retirar {n}</Boton>
    </Modal>
  )
}
