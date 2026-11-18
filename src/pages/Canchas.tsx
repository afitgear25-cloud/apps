import { useState } from 'react'
import { actualizar, useDB, useUsuario } from '../data/store'
import type { Asignacion, DB } from '../data/types'
import { chocan, equipos, nombreEquipo } from '../data/logic'
import { DIAS, DIAS_CORTO, colorDe, uid } from '../lib/util'
import { exportar } from '../lib/excel'
import { Boton, Campo, Modal, Tarjeta, Titulo, Vacio } from '../components/ui'
import { CanchaSVG, type Ocupante } from '../components/CanchaSVG'

const HORAS = Array.from({ length: 31 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)
const corto = (db: DB, equipoId: string) => {
  const n = nombreEquipo(db, equipoId)
  return n.startsWith('Primera') ? `1ra ${n.split(' ').pop()}` : n.split(' ').pop()!
}

function ocupacion(db: DB, asigs: Asignacion[], resaltar?: string[]) {
  const o: Record<string, Ocupante[]> = {}
  for (const a of asigs) for (const z of a.zonas) (o[z] ??= []).push({ texto: corto(db, a.equipoId), color: resaltar && !resaltar.includes(a.equipoId) ? '#3f3f46' : colorDe(a.equipoId) })
  return o
}

export function Canchas() {
  const db = useDB()
  const u = useUsuario()!
  const esCoord = u.rol === 'coordinacion'
  const [dia, setDia] = useState(new Date().getDay())
  const delDia = db.asignaciones.filter((a) => a.dia === dia).sort((a, b) => a.desde.localeCompare(b.desde))
  const [hora, setHora] = useState(() => {
    const ahora = new Date()
    const h = `${String(ahora.getHours()).padStart(2, '0')}:${ahora.getMinutes() < 30 ? '00' : '30'}`
    return HORAS.includes(h) ? h : '18:00'
  })
  const [form, setForm] = useState<Asignacion | null>(null)
  const enHora = delDia.filter((a) => a.desde <= hora && hora < a.hasta)
  const puedeEditar = (a: Asignacion) => esCoord || u.equipos.includes(a.equipoId)

  return (
    <>
      <Titulo sub="Cancha de 11 = 3 canchas de 9 (con redes a lo largo) · Canchas de 7 = 2 canchas de 5 cada una"
        extra={<>
          <Boton v="oscuro" onClick={() => exportar.canchas(db)}>Bajar Excel</Boton>
          {(esCoord || u.equipos.length > 0) && <Boton onClick={() => setForm({ id: '', canchaId: 'c11', dia, desde: '18:00', hasta: '19:30', zonas: [], equipoId: esCoord ? '' : u.equipos[0] })}>+ Asignar lugar</Boton>}
        </>}>Canchas</Titulo>

      <div className="flex gap-1 overflow-x-auto mb-3">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <button key={d} onClick={() => setDia(d)} className={`px-4 py-2 rounded-xl text-sm font-bold border ${dia === d ? 'bg-rojo border-rojo' : 'border-borde text-tenue'}`}>
            {DIAS_CORTO[d]} <span className="text-xs opacity-70">({db.asignaciones.filter((a) => a.dia === d).length})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-tenue">Ver cómo están las canchas a las</span>
        <select value={hora} onChange={(e) => setHora(e.target.value)} className="w-auto">{HORAS.map((h) => <option key={h}>{h}</option>)}</select>
        <div className="flex gap-1 overflow-x-auto">
          {[...new Set(delDia.map((a) => a.desde))].map((h) => <button key={h} onClick={() => setHora(h)} className={`text-xs px-2 py-1 rounded-lg border ${hora === h ? 'border-white' : 'border-borde text-tenue'}`}>{h}</button>)}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4 mb-6">
        {db.canchas.filter((c) => c.forma === 'f11').map((c) => (
          <Tarjeta key={c.id}>
            <div className="font-bold mb-2">{c.nombre}</div>
            <CanchaSVG cancha={c} ocupacion={ocupacion(db, enHora.filter((a) => a.canchaId === c.id), esCoord ? undefined : u.equipos)} />
          </Tarjeta>
        ))}
        <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-4">
          {db.canchas.filter((c) => c.forma !== 'f11').map((c) => (
            <Tarjeta key={c.id}>
              <div className="font-bold mb-2">{c.nombre}</div>
              <CanchaSVG cancha={c} ocupacion={ocupacion(db, enHora.filter((a) => a.canchaId === c.id), esCoord ? undefined : u.equipos)} />
            </Tarjeta>
          ))}
        </div>
      </div>

      <h2 className="font-bold mb-2">Todo el {DIAS[dia].toLowerCase()}</h2>
      {!delDia.length && <Vacio>No hay lugares asignados este día.</Vacio>}
      <div className="grid md:grid-cols-3 gap-3">
        {db.canchas.map((c) => {
          const lista = delDia.filter((a) => a.canchaId === c.id)
          if (!lista.length) return null
          return (
            <Tarjeta key={c.id}>
              <div className="font-bold mb-2">{c.nombre}</div>
              <ul className="flex flex-col gap-1.5">
                {lista.map((a) => {
                  const choque = db.asignaciones.some((b) => chocan(a, b))
                  return (
                    <li key={a.id}>
                      <button disabled={!puedeEditar(a)} onClick={() => setForm(structuredClone(a))}
                        className={`w-full text-left flex items-center gap-2 rounded-lg px-2 py-1.5 border ${choque ? 'border-amber-400' : 'border-borde'} ${puedeEditar(a) ? 'hover:border-rojo' : ''}`}>
                        <span className="w-2.5 h-8 rounded" style={{ background: colorDe(a.equipoId) }} />
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold text-sm truncate">{nombreEquipo(db, a.equipoId)}</span>
                          <span className="block text-xs text-tenue">{a.desde}–{a.hasta} · {a.zonas.map((z) => c.zonas.find((x) => x.id === z)?.nombre.replace('Fútbol ', 'F')).join(' + ')}{choque ? ' · ⚠ choca' : ''}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Tarjeta>
          )
        })}
      </div>

      {form && <FormAsignacion db={db} inicial={form} equiposPermitidos={esCoord ? equipos(db).map((e) => e.id) : u.equipos} onClose={() => setForm(null)} />}
    </>
  )
}

function FormAsignacion({ db, inicial, equiposPermitidos, onClose }: { db: DB; inicial: Asignacion; equiposPermitidos: string[]; onClose: () => void }) {
  const [a, setA] = useState(inicial)
  const set = <K extends keyof Asignacion>(k: K, v: Asignacion[K]) => setA((x) => ({ ...x, [k]: v }))
  const cancha = db.canchas.find((c) => c.id === a.canchaId)!
  const otros = db.asignaciones.filter((b) => b.id !== a.id && b.canchaId === a.canchaId && b.dia === a.dia && b.desde < a.hasta && a.desde < b.hasta)
  const choques = otros.filter((b) => b.zonas.some((z) => a.zonas.includes(z)))
  const libres = cancha.zonas.filter((z) => !otros.some((b) => b.zonas.includes(z.id))).map((z) => z.id)
  const valido = a.equipoId && a.zonas.length && a.desde < a.hasta && !choques.length

  const guardar = () => {
    const nueva = { ...a, id: a.id || uid() }
    actualizar((d) => { d.asignaciones = [...d.asignaciones.filter((x) => x.id !== nueva.id), nueva] },
      `Cancha: ${nombreEquipo(db, nueva.equipoId)} ${DIAS[nueva.dia]} ${nueva.desde}-${nueva.hasta} en ${cancha.nombre} (${nueva.zonas.map((z) => cancha.zonas.find((x) => x.id === z)?.nombre).join(' + ')})`)
    onClose()
  }

  return (
    <Modal titulo={inicial.id ? 'Editar lugar en la cancha' : 'Asignar lugar en la cancha'} onClose={onClose}>
      <Campo label="Equipo">
        <select value={a.equipoId} onChange={(e) => set('equipoId', e.target.value)}>
          <option value="">Elegí el equipo…</option>
          {equiposPermitidos.map((id) => <option key={id} value={id}>{nombreEquipo(db, id)}</option>)}
        </select>
      </Campo>
      <Campo label="Día">
        <div className="flex gap-1 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => <button key={d} type="button" onClick={() => set('dia', d)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${a.dia === d ? 'bg-rojo border-rojo' : 'border-borde text-tenue'}`}>{DIAS_CORTO[d]}</button>)}
        </div>
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Desde"><select value={a.desde} onChange={(e) => set('desde', e.target.value)}>{HORAS.map((h) => <option key={h}>{h}</option>)}</select></Campo>
        <Campo label="Hasta"><select value={a.hasta} onChange={(e) => set('hasta', e.target.value)}>{HORAS.map((h) => <option key={h}>{h}</option>)}</select></Campo>
      </div>
      <Campo label="Cancha">
        <div className="flex gap-1 flex-wrap">
          {db.canchas.map((c) => <button key={c.id} type="button" onClick={() => setA((x) => ({ ...x, canchaId: c.id, zonas: [] }))} className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${a.canchaId === c.id ? 'bg-white text-negro border-white' : 'border-borde text-tenue'}`}>{c.nombre}</button>)}
        </div>
      </Campo>
      <Campo label="Sector (tocá un atajo o las partes de la cancha)">
        <div className="flex gap-1 flex-wrap mb-2">
          {cancha.atajos.map((t) => {
            const libre = t.zonas.every((z) => libres.includes(z))
            const on = t.zonas.length === a.zonas.length && t.zonas.every((z) => a.zonas.includes(z))
            return <button key={t.nombre} type="button" disabled={!libre} onClick={() => set('zonas', t.zonas)} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-30 ${on ? 'bg-rojo border-rojo' : 'border-borde text-tenue'}`}>{t.nombre}</button>
          })}
        </div>
        <CanchaSVG cancha={cancha} ocupacion={ocupacion(db, otros)} seleccion={a.zonas}
          onZona={(z) => set('zonas', a.zonas.includes(z) ? a.zonas.filter((x) => x !== z) : [...a.zonas, z])} />
        <p className="text-xs text-tenue mt-1">
          {libres.length ? `Libre en ese horario: ${libres.map((z) => cancha.zonas.find((x) => x.id === z)?.nombre).join(', ')}` : 'No queda lugar libre en esa cancha en ese horario.'}
        </p>
      </Campo>
      {choques.length > 0 && (
        <p className="text-amber-300 text-sm mb-2">⚠ Choca con {choques.map((b) => `${nombreEquipo(db, b.equipoId)} (${b.desde}–${b.hasta})`).join(', ')}. Elegí otro sector u horario.</p>
      )}
      {a.desde >= a.hasta && <p className="text-rojo-claro text-sm mb-2">El horario de fin tiene que ser después del de inicio.</p>}
      <div className="flex gap-2 mt-3">
        <Boton grande className="flex-1" disabled={!valido} onClick={guardar}>Guardar</Boton>
        {inicial.id && <Boton grande v="oscuro" onClick={() => {
          actualizar((d) => { d.asignaciones = d.asignaciones.filter((x) => x.id !== inicial.id) }, `Quitó lugar de ${nombreEquipo(db, inicial.equipoId)} ${DIAS[inicial.dia]} ${inicial.desde}`)
          onClose()
        }}>Quitar</Boton>}
      </div>
    </Modal>
  )
}
