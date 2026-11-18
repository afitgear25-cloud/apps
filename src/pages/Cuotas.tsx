import { useState } from 'react'
import { actualizar, useDB, useUsuario } from '../data/store'
import type { DB, Jugador, MedioPago } from '../data/types'
import { cuotaDe, equipoBase, mesesAdeudados, nombreCompleto, nombreEquipo } from '../data/logic'
import { hoy, mesActual, nombreMes, pesos, sumarMes, uid } from '../lib/util'
import { exportar } from '../lib/excel'
import { Boton, Campo, Chip, Dato, Modal, Pestanas, Titulo, Vacio } from '../components/ui'
import { FiltroEquipo, coincide } from '../components/FiltroEquipo'

export function Cuotas() {
  const db = useDB()
  const [tab, setTab] = useState<'mes' | 'atrasados'>('mes')
  const [mes, setMes] = useState(mesActual())
  const [filtro, setFiltro] = useState('')
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState<'' | 'pagado' | 'pendiente'>('')
  const [cobrar, setCobrar] = useState<{ j: Jugador; mes: string } | null>(null)

  const base = db.jugadores
    .filter((j) => j.activo && coincide(filtro, equipoBase(db, j)))
    .filter((j) => !q || `${j.apellido} ${j.nombre} ${j.dni}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.apellido.localeCompare(b.apellido))
  const delMes = base.filter((j) => j.alta <= mes)
  const pago = (j: Jugador, m: string) => db.pagos.find((p) => p.jugadorId === j.id && p.mes === m)
  const pagados = delMes.filter((j) => pago(j, mes))
  const lista = delMes.filter((j) => !estado || (estado === 'pagado') === !!pago(j, mes))
  const atrasados = base.map((j) => ({ j, meses: mesesAdeudados(db, j).filter((m) => m < mesActual()) })).filter((x) => x.meses.length).sort((a, b) => b.meses.length - a.meses.length)

  return (
    <>
      <Titulo extra={<Boton v="oscuro" onClick={() => exportar.cuotas(db)}>Bajar Excel</Boton>}>Cuotas</Titulo>
      <Pestanas valor={tab} onChange={setTab} opciones={[{ id: 'mes', texto: 'Por mes' }, { id: 'atrasados', texto: `Atrasados (${atrasados.length})` }]} />
      <div className="grid sm:grid-cols-2 gap-2 mb-4">
        <FiltroEquipo db={db} valor={filtro} onChange={setFiltro} sinPrimera />
        <input placeholder="Buscar jugador…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {tab === 'mes' ? (
        <>
          <div className="flex items-center justify-between gap-2 mb-3">
            <Boton v="oscuro" onClick={() => setMes(sumarMes(mes, -1))}>‹</Boton>
            <div className="font-bold text-lg">{nombreMes(mes)}</div>
            <Boton v="oscuro" disabled={mes >= mesActual()} onClick={() => setMes(sumarMes(mes, 1))}>›</Boton>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Dato rojo valor={pesos(db.pagos.filter((p) => p.mes === mes && delMes.some((j) => j.id === p.jugadorId)).reduce((s, p) => s + p.monto, 0))} texto="Cobrado" />
            <Dato valor={pagados.length} texto="Pagaron" />
            <Dato valor={delMes.length - pagados.length} texto="Pendientes" />
          </div>
          <div className="flex gap-1 mb-3">
            {([['', 'Todos'], ['pendiente', 'Pendientes'], ['pagado', 'Pagados']] as const).map(([v, t]) => (
              <button key={v} onClick={() => setEstado(v)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${estado === v ? 'bg-white text-negro border-white' : 'border-borde text-tenue'}`}>{t}</button>
            ))}
          </div>
          {!lista.length && <Vacio>No hay jugadores con ese filtro.</Vacio>}
          <ul className="flex flex-col gap-1.5">
            {lista.map((j) => {
              const p = pago(j, mes)
              const b = equipoBase(db, j)
              return (
                <li key={j.id} className="flex items-center gap-3 bg-panel border border-borde rounded-xl px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{nombreCompleto(j)}</div>
                    <div className="text-xs text-tenue">{b ? nombreEquipo(db, b) : '—'} · {p ? `${pesos(p.monto)} · ${p.medio} · ${p.fecha.split('-').reverse().join('/')}` : pesos(cuotaDe(db, j))}</div>
                  </div>
                  {p ? (
                    <>
                      <Chip tono="verde">✔ Pagado</Chip>
                      <button className="text-xs text-tenue hover:text-rojo-claro" onClick={() => {
                        if (!confirm(`¿Anular el pago de ${nombreCompleto(j)} de ${nombreMes(mes)}?`)) return
                        actualizar((d) => { d.pagos = d.pagos.filter((x) => x.id !== p.id) }, `Anuló pago de ${nombreCompleto(j)} (${mes})`)
                      }}>Anular</button>
                    </>
                  ) : <Boton onClick={() => setCobrar({ j, mes })}>Cobrar</Boton>}
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <>
          {!atrasados.length && <Vacio>Nadie debe meses anteriores. 🎉</Vacio>}
          <ul className="flex flex-col gap-1.5">
            {atrasados.map(({ j, meses }) => {
              const b = equipoBase(db, j)
              return (
                <li key={j.id} className="bg-panel border border-borde rounded-xl px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{nombreCompleto(j)}</div>
                      <div className="text-xs text-tenue">{b ? nombreEquipo(db, b) : '—'} · debe {meses.length} {meses.length === 1 ? 'mes' : 'meses'} · {pesos(meses.length * cuotaDe(db, j))}</div>
                    </div>
                    <Chip tono="rojo">{meses.length}</Chip>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {meses.map((m) => <button key={m} onClick={() => setCobrar({ j, mes: m })} className="text-xs px-2 py-1 rounded-lg border border-rojo/50 text-rojo-claro hover:bg-rojo hover:text-white">Cobrar {nombreMes(m)}</button>)}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {cobrar && <Cobrar db={db} j={cobrar.j} mes={cobrar.mes} onClose={() => setCobrar(null)} />}
    </>
  )
}

function Cobrar({ db, j, mes, onClose }: { db: DB; j: Jugador; mes: string; onClose: () => void }) {
  const u = useUsuario()!
  const [monto, setMonto] = useState(cuotaDe(db, j))
  const [medio, setMedio] = useState<MedioPago>('efectivo')
  return (
    <Modal titulo={`Cobrar ${nombreMes(mes)}`} onClose={onClose}>
      <p className="font-semibold mb-3">{nombreCompleto(j)}</p>
      <Campo label="Monto"><input type="number" inputMode="numeric" min={0} value={monto} onChange={(e) => setMonto(Math.max(0, Number(e.target.value)))} /></Campo>
      <Campo label="Medio de pago">
        <div className="flex gap-1.5">
          {(['efectivo', 'transferencia'] as const).map((m) => <button key={m} onClick={() => setMedio(m)} className={`flex-1 py-3 rounded-xl font-bold border capitalize ${medio === m ? 'bg-rojo border-rojo' : 'border-borde text-tenue'}`}>{m}</button>)}
        </div>
      </Campo>
      <Boton grande className="w-full mt-2" disabled={!monto} onClick={() => {
        actualizar((d) => { d.pagos.push({ id: uid(), jugadorId: j.id, mes, monto, medio, fecha: hoy(), por: u.nombre }) }, `Cobró ${pesos(monto)} (${medio}) a ${nombreCompleto(j)} por ${mes}`)
        onClose()
      }}>Registrar pago de {pesos(monto)}</Boton>
    </Modal>
  )
}
