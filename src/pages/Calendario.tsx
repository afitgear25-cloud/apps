import { useState } from 'react'
import { actualizar, useDB, useUsuario } from '../data/store'
import type { DB, Evento, TipoEvento } from '../data/types'
import { equipos, nombreEquipo } from '../data/logic'
import { puede } from '../lib/permisos'
import { DIAS_CORTO, MESES, fechaLarga, hoy, isoFecha, uid } from '../lib/util'
import { exportar } from '../lib/excel'
import { Boton, Campo, Modal, Titulo } from '../components/ui'
import { FilaEvento, TIPOS, tituloEvento } from '../components/Eventos'

export function Calendario() {
  const db = useDB()
  const u = useUsuario()!
  const editar = puede(u, 'calendario-editar')
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [dia, setDia] = useState(hoy())
  const [form, setForm] = useState<Evento | null>(null)

  const visibles = db.eventos.filter((e) => u.rol !== 'entrenador' || !e.equipos.length || e.equipos.some((x) => u.equipos.includes(x)))
  const porDia = (f: string) => visibles.filter((e) => e.fecha === f).sort((a, b) => a.hora.localeCompare(b.hora))

  // Grilla que empieza en lunes.
  const inicio = new Date(mes)
  inicio.setDate(1 - ((mes.getDay() + 6) % 7))
  const celdas = Array.from({ length: 42 }, (_, i) => { const d = new Date(inicio); d.setDate(inicio.getDate() + i); return d })
  const f = hoy()

  const nuevo = (fecha: string): Evento => {
    const finde = [0, 6].includes(new Date(fecha + 'T12:00').getDay())
    return { id: '', fecha, hora: finde ? '10:00' : '18:00', horaFin: finde ? '11:30' : '19:30', tipo: finde ? 'partido' : 'entrenamiento', titulo: '', equipos: [], rival: '', condicion: 'local', lugar: '', notas: '' }
  }

  return (
    <>
      <Titulo extra={<>
        <Boton v="oscuro" onClick={() => exportar.calendario(db)}>Bajar Excel</Boton>
        {editar && <Boton onClick={() => setForm(nuevo(dia))}>+ Nueva actividad</Boton>}
      </>}>Calendario</Titulo>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="bg-panel border border-borde rounded-2xl p-3">
          <div className="flex items-center justify-between mb-3">
            <Boton v="fantasma" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} aria-label="Mes anterior">‹</Boton>
            <div className="font-bold text-lg">{MESES[mes.getMonth()]} {mes.getFullYear()}</div>
            <Boton v="fantasma" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} aria-label="Mes siguiente">›</Boton>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => <div key={d} className={d === 0 || d === 6 ? 'text-rojo-claro font-bold' : 'text-tenue'}>{DIAS_CORTO[d]}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celdas.map((d) => {
              const iso = isoFecha(d)
              const evs = porDia(iso)
              const fuera = d.getMonth() !== mes.getMonth()
              const finde = d.getDay() === 0 || d.getDay() === 6
              return (
                <button key={iso} onClick={() => setDia(iso)}
                  className={`min-h-16 sm:min-h-24 rounded-lg p-1 text-left align-top border transition flex flex-col ${dia === iso ? 'border-rojo bg-rojo/10' : 'border-transparent hover:border-borde'} ${finde ? 'bg-white/[0.04]' : ''} ${fuera ? 'opacity-35' : ''}`}>
                  <span className={`text-xs font-bold inline-flex w-6 h-6 items-center justify-center rounded-full ${iso === f ? 'bg-rojo text-white' : finde ? 'text-rojo-claro' : ''}`}>{d.getDate()}</span>
                  <span className="hidden sm:flex flex-col gap-0.5 mt-0.5">
                    {evs.slice(0, 3).map((e) => (
                      <span key={e.id} className={`text-[10px] leading-tight truncate rounded px-1 ${e.tipo === 'partido' ? 'bg-rojo text-white' : 'bg-white/15'}`}>{e.hora} {tituloEvento(db, e)}</span>
                    ))}
                    {evs.length > 3 && <span className="text-[10px] text-tenue">+{evs.length - 3} más</span>}
                  </span>
                  {evs.length > 0 && <span className="sm:hidden flex gap-0.5 mt-1">{evs.slice(0, 4).map((e) => <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${e.tipo === 'partido' ? 'bg-rojo' : 'bg-white'}`} />)}</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold capitalize">{fechaLarga(dia)}</h2>
            {editar && <Boton v="oscuro" onClick={() => setForm(nuevo(dia))}>+ Agregar</Boton>}
          </div>
          <div className="flex flex-col gap-2">
            {porDia(dia).map((e) => <FilaEvento key={e.id} db={db} e={e} conFecha={false} onClick={editar ? () => setForm(structuredClone(e)) : undefined} />)}
            {!porDia(dia).length && <p className="text-tenue text-sm">Sin actividades este día.</p>}
          </div>
        </div>
      </div>

      {form && <FormEvento db={db} inicial={form} onClose={() => setForm(null)} />}
    </>
  )
}

function FormEvento({ db, inicial, onClose }: { db: DB; inicial: Evento; onClose: () => void }) {
  const [e, setE] = useState(inicial)
  const set = <K extends keyof Evento>(k: K, v: Evento[K]) => setE((x) => ({ ...x, [k]: v }))
  const valido = e.fecha && e.hora && (e.tipo !== 'partido' || (e.rival.trim() && e.equipos.length))
  const guardar = () => {
    const ev = { ...e, id: e.id || uid() }
    actualizar((d) => { d.eventos = [...d.eventos.filter((x) => x.id !== ev.id), ev] }, `${inicial.id ? 'Editó' : 'Agregó'} actividad: ${tituloEvento(db, ev)} (${ev.fecha})`)
    onClose()
  }
  return (
    <Modal titulo={inicial.id ? 'Editar actividad' : 'Nueva actividad'} onClose={onClose}>
      <Campo label="Tipo">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(TIPOS) as TipoEvento[]).map((t) => (
            <button key={t} type="button" onClick={() => set('tipo', t)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${e.tipo === t ? 'bg-rojo border-rojo' : 'border-borde text-tenue'}`}>{TIPOS[t]}</button>
          ))}
        </div>
      </Campo>
      <div className="grid grid-cols-3 gap-2">
        <Campo label="Fecha"><input type="date" value={e.fecha} onChange={(x) => set('fecha', x.target.value)} /></Campo>
        <Campo label="Desde"><input type="time" value={e.hora} onChange={(x) => set('hora', x.target.value)} /></Campo>
        <Campo label="Hasta"><input type="time" value={e.horaFin} onChange={(x) => set('horaFin', x.target.value)} /></Campo>
      </div>
      {e.tipo === 'partido' ? (
        <>
          <Campo label="Rival *"><input value={e.rival} placeholder="Nombre del club rival" onChange={(x) => set('rival', x.target.value)} /></Campo>
          <Campo label="Condición">
            <div className="flex gap-1.5">
              {(['local', 'visitante', 'neutral'] as const).map((c) => (
                <button key={c} type="button" onClick={() => set('condicion', c)} className={`flex-1 py-2 rounded-lg text-sm font-semibold border capitalize ${e.condicion === c ? 'bg-white text-negro border-white' : 'border-borde text-tenue'}`}>{c}</button>
              ))}
            </div>
          </Campo>
        </>
      ) : (
        <Campo label="Actividad"><input value={e.titulo} placeholder="Ej.: Torneo de verano, reunión de padres…" onChange={(x) => set('titulo', x.target.value)} /></Campo>
      )}
      <Campo label="Lugar"><input value={e.lugar} placeholder={e.condicion === 'visitante' ? 'Cancha del rival' : 'Cancha de 11, canchas de 7…'} onChange={(x) => set('lugar', x.target.value)} /></Campo>
      <Campo label={`Equipos ${e.tipo === 'partido' ? '*' : '(vacío = todo el club)'}`}>
        <div className="max-h-48 overflow-y-auto flex flex-col gap-2 pr-1">
          {[...db.divisiones].sort((a, b) => a.orden - b.orden).map((d) => (
            <div key={d.id}>
              <div className="text-xs text-tenue mb-1">{d.nombre}</div>
              <div className="flex flex-wrap gap-1">
                {equipos(db).filter((q) => q.divisionId === d.id).map((q) => {
                  const on = e.equipos.includes(q.id)
                  return <button key={q.id} type="button" onClick={() => set('equipos', on ? e.equipos.filter((x) => x !== q.id) : [...e.equipos, q.id])} className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold ${on ? 'bg-rojo border-rojo' : 'border-borde text-tenue'}`}>{q.anio}</button>
                })}
              </div>
            </div>
          ))}
        </div>
      </Campo>
      <Campo label="Notas"><textarea rows={2} value={e.notas} placeholder="Horario de presentación, micro, etc." onChange={(x) => set('notas', x.target.value)} /></Campo>
      <div className="flex gap-2 mt-4">
        <Boton grande disabled={!valido} onClick={guardar} className="flex-1">Guardar</Boton>
        {inicial.id && <Boton grande v="oscuro" onClick={() => {
          if (!confirm('¿Borrar esta actividad?')) return
          actualizar((d) => { d.eventos = d.eventos.filter((x) => x.id !== inicial.id) }, `Borró actividad: ${tituloEvento(db, inicial)} (${inicial.fecha})`)
          onClose()
        }}>Borrar</Boton>}
      </div>
      {e.tipo === 'partido' && e.equipos.length > 0 && <p className="text-xs text-tenue mt-2">{e.equipos.map((x) => nombreEquipo(db, x)).join(', ')} vs {e.rival || '…'}</p>}
    </Modal>
  )
}
