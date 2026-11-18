import { useState } from 'react'
import { actualizar, useDB } from '../data/store'
import type { DB, EstadoRopa, Prenda } from '../data/types'
import { equipoBase, nombreCompleto, nombreEquipo } from '../data/logic'
import { pesos, uid } from '../lib/util'
import { exportar } from '../lib/excel'
import { Boton, Campo, Foto, FotoInput, Modal, Pestanas, Tarjeta, Titulo, Vacio } from '../components/ui'
import { FiltroEquipo, coincide } from '../components/FiltroEquipo'

const SIGUIENTE: Record<EstadoRopa, EstadoRopa> = { falta: 'entregada', entregada: 'pagada', pagada: 'falta' }
const ESTILO: Record<EstadoRopa, string> = {
  falta: 'border-rojo/60 text-rojo-claro',
  entregada: 'border-amber-400/60 text-amber-300',
  pagada: 'bg-emerald-600/25 border-emerald-500/60 text-emerald-300',
}
const TEXTO: Record<EstadoRopa, string> = { falta: 'Falta', entregada: 'Sin pagar', pagada: 'Pagada' }

export function Ropa() {
  const db = useDB()
  const [tab, setTab] = useState<'catalogo' | 'jugadores'>('catalogo')
  const [form, setForm] = useState<Prenda | null>(null)
  return (
    <>
      <Titulo extra={<>
        <Boton v="oscuro" onClick={() => exportar.ropa(db)}>Bajar Excel</Boton>
        {tab === 'catalogo' && <Boton onClick={() => setForm({ id: '', nombre: '', precio: 0, obligatoria: true })}>+ Nueva prenda</Boton>}
      </>}>Ropa</Titulo>
      <Pestanas valor={tab} onChange={setTab} opciones={[{ id: 'catalogo', texto: 'Catálogo y precios' }, { id: 'jugadores', texto: 'Por jugador' }]} />
      {tab === 'catalogo' ? <Catalogo db={db} onEditar={setForm} /> : <PorJugador db={db} />}
      {form && <FormPrenda inicial={form} onClose={() => setForm(null)} />}
    </>
  )
}

function Catalogo({ db, onEditar }: { db: DB; onEditar: (p: Prenda) => void }) {
  const activos = db.jugadores.filter((j) => j.activo)
  if (!db.prendas.length) return <Vacio>No hay prendas cargadas.</Vacio>
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {db.prendas.map((p) => {
        const falta = activos.filter((j) => (db.ropa[`${j.id}|${p.id}`] ?? (p.obligatoria ? 'falta' : undefined)) === 'falta').length
        return (
          <button key={p.id} onClick={() => onEditar(structuredClone(p))} className="text-left bg-panel border border-borde hover:border-rojo rounded-2xl p-3 flex flex-col gap-2">
            <Foto src={p.foto} alt={p.nombre} className="w-full aspect-square rounded-xl" />
            <div className="font-bold leading-tight">{p.nombre}</div>
            <div className="text-2xl font-black text-rojo-claro">{pesos(p.precio)}</div>
            <div className="text-xs text-tenue">{p.obligatoria ? `Obligatoria · le falta a ${falta}` : 'Opcional'}</div>
          </button>
        )
      })}
    </div>
  )
}

function PorJugador({ db }: { db: DB }) {
  const [filtro, setFiltro] = useState('')
  const [soloFaltantes, setSoloFaltantes] = useState(false)
  const [q, setQ] = useState('')
  const estado = (jid: string, p: Prenda): EstadoRopa | undefined => db.ropa[`${jid}|${p.id}`] ?? (p.obligatoria ? 'falta' : undefined)
  const lista = db.jugadores
    .filter((j) => j.activo && coincide(filtro, equipoBase(db, j)))
    .filter((j) => !q || `${j.apellido} ${j.nombre}`.toLowerCase().includes(q.toLowerCase()))
    .filter((j) => !soloFaltantes || db.prendas.some((p) => estado(j.id, p) !== undefined && estado(j.id, p) !== 'pagada'))
    .sort((a, b) => a.apellido.localeCompare(b.apellido))
  return (
    <>
      <div className="grid sm:grid-cols-3 gap-2 mb-3">
        <FiltroEquipo db={db} valor={filtro} onChange={setFiltro} sinPrimera />
        <input placeholder="Buscar jugador…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-white m-0"><input type="checkbox" checked={soloFaltantes} onChange={(e) => setSoloFaltantes(e.target.checked)} /> Solo con algo pendiente</label>
      </div>
      <p className="text-xs text-tenue mb-3">Tocá cada prenda para cambiar: <b className="text-rojo-claro">Falta</b> → <b className="text-amber-300">Entregada sin pagar</b> → <b className="text-emerald-300">Pagada</b>.</p>
      {!lista.length && <Vacio>No hay jugadores con ese filtro.</Vacio>}
      <ul className="flex flex-col gap-1.5">
        {lista.map((j) => {
          const b = equipoBase(db, j)
          return (
            <li key={j.id} className="bg-panel border border-borde rounded-xl px-3 py-2">
              <div className="font-semibold">{nombreCompleto(j)} <span className="text-xs text-tenue font-normal">{b ? nombreEquipo(db, b) : ''}</span></div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {db.prendas.map((p) => {
                  const e = estado(j.id, p)
                  return (
                    <button key={p.id} onClick={() => {
                      const nuevo = SIGUIENTE[e ?? 'pagada']
                      actualizar((d) => { d.ropa[`${j.id}|${p.id}`] = nuevo }, `Ropa: ${p.nombre} de ${nombreCompleto(j)} → ${TEXTO[nuevo]}`)
                    }} className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold ${e ? ESTILO[e] : 'border-borde text-zinc-500'}`}>
                      {p.nombre}: {e ? TEXTO[e] : 'No pidió'}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function FormPrenda({ inicial, onClose }: { inicial: Prenda; onClose: () => void }) {
  const [p, setP] = useState(inicial)
  const set = <K extends keyof Prenda>(k: K, v: Prenda[K]) => setP((x) => ({ ...x, [k]: v }))
  return (
    <Modal titulo={inicial.id ? 'Editar prenda' : 'Nueva prenda'} onClose={onClose}>
      <div className="mb-4"><FotoInput valor={p.foto} onChange={(v) => set('foto', v)} /></div>
      <Campo label="Prenda"><input value={p.nombre} placeholder="Ej.: Camiseta oficial" onChange={(e) => set('nombre', e.target.value)} /></Campo>
      <Campo label="Precio"><input type="number" min={0} inputMode="numeric" value={p.precio} onChange={(e) => set('precio', Math.max(0, Number(e.target.value)))} /></Campo>
      <label className="flex items-center gap-2 text-sm text-white mb-3"><input type="checkbox" checked={p.obligatoria} onChange={(e) => set('obligatoria', e.target.checked)} /> Obligatoria para todos los jugadores</label>
      <Tarjeta className="p-3! text-xs text-tenue mb-3">Las obligatorias aparecen como “Falta” en cada jugador hasta que se marquen entregadas.</Tarjeta>
      <div className="flex gap-2">
        <Boton grande className="flex-1" disabled={!p.nombre.trim()} onClick={() => {
          const nueva = { ...p, id: p.id || uid(), nombre: p.nombre.trim() }
          actualizar((d) => { d.prendas = inicial.id ? d.prendas.map((x) => (x.id === nueva.id ? nueva : x)) : [...d.prendas, nueva] }, `${inicial.id ? 'Editó' : 'Agregó'} prenda ${nueva.nombre} (${pesos(nueva.precio)})`)
          onClose()
        }}>Guardar</Boton>
        {inicial.id && <Boton grande v="oscuro" onClick={() => {
          if (!confirm(`¿Borrar ${inicial.nombre}?`)) return
          actualizar((d) => {
            d.prendas = d.prendas.filter((x) => x.id !== inicial.id)
            for (const k of Object.keys(d.ropa)) if (k.endsWith('|' + inicial.id)) delete d.ropa[k]
          }, `Borró prenda ${inicial.nombre}`)
          onClose()
        }}>Borrar</Boton>}
      </div>
    </Modal>
  )
}
