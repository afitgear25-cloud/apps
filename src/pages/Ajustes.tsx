import { useRef, useState } from 'react'
import { actualizar, enNube, getDB, reemplazarTodo, restaurarEjemplo, useDB } from '../data/store'
import { subirEscudo } from '../data/nube'
import type { DB, Division } from '../data/types'
import { leerEscudo } from '../lib/images'
import { descargar } from '../lib/descargar'
import { hoy, pesos } from '../lib/util'
import { Boton, Campo, Escudo, Tarjeta, Titulo } from '../components/ui'

export function Ajustes() {
  const db = useDB()
  const escudoRef = useRef<HTMLInputElement>(null)
  const backupRef = useRef<HTMLInputElement>(null)
  const [nombre, setNombre] = useState(db.config.clubNombre)
  const [verRegistro, setVerRegistro] = useState(false)

  return (
    <>
      <Titulo>Ajustes</Titulo>
      <div className="grid md:grid-cols-2 gap-4">
        <Tarjeta>
          <h2 className="font-bold mb-3">Club</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-24 h-24 rounded-2xl bg-negro border border-borde p-2"><Escudo src={db.config.escudo} className="w-full h-full" /></div>
            <div className="flex flex-col gap-2">
              <input ref={escudoRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                let src = await leerEscudo(f)
                if (enNube) {
                  try { src = await subirEscudo(src) } catch { alert('No se pudo subir el escudo. Revisá la conexión.'); return }
                }
                actualizar((d) => { d.config.escudo = src }, 'Cambió el escudo del club')
                e.target.value = ''
              }} />
              <Boton onClick={() => escudoRef.current?.click()}>Subir escudo</Boton>
              {db.config.escudo && <Boton v="fantasma" onClick={() => actualizar((d) => { delete d.config.escudo }, 'Quitó el escudo')}>Usar el provisorio</Boton>}
            </div>
          </div>
          <Campo label="Nombre del club">
            <div className="flex gap-2">
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
              <Boton disabled={!nombre.trim() || nombre === db.config.clubNombre} onClick={() => actualizar((d) => { d.config.clubNombre = nombre.trim() }, `Cambió el nombre del club a ${nombre.trim()}`)}>Guardar</Boton>
            </div>
          </Campo>
          <Campo label="Temporada">
            <input type="number" value={db.config.temporada} onChange={(e) => { const v = Number(e.target.value); if (v > 2000 && v < 2100) actualizar((d) => { d.config.temporada = v }, `Cambió la temporada a ${v}`) }} />
          </Campo>
        </Tarjeta>

        <Tarjeta>
          <h2 className="font-bold mb-1">Divisiones y categorías</h2>
          <p className="text-sm text-tenue mb-3">Cada año cambian los años de nacimiento: editalos acá al empezar la temporada.</p>
          {[...db.divisiones].sort((a, b) => a.orden - b.orden).map((d) => <FilaDivision key={d.id + d.anios.join()} d={d} />)}
        </Tarjeta>

        <Tarjeta>
          <h2 className="font-bold mb-1">Respaldo</h2>
          <p className="text-sm text-tenue mb-3">{enNube ? 'Los datos están en la nube. Igual podés bajar una copia completa cuando quieras (además del Excel).' : 'Los datos viven en este dispositivo. Bajá un respaldo seguido; con él podés pasar todo a otro celular o computadora.'}</p>
          <div className="flex flex-wrap gap-2">
            <Boton onClick={() => descargar(new Blob([JSON.stringify(getDB())], { type: 'application/json' }), `respaldo-club-${hoy()}.json`)}>Bajar respaldo</Boton>
            {!enNube && <><input ref={backupRef} type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              try {
                const data = JSON.parse(await f.text()) as DB
                if (data.version !== 1 || !Array.isArray(data.jugadores)) throw new Error()
                if (confirm('Esto reemplaza todos los datos de este dispositivo por los del respaldo. ¿Seguir?')) reemplazarTodo(data)
              } catch {
                alert('Ese archivo no es un respaldo válido de la app.')
              }
              e.target.value = ''
            }} />
            <Boton v="oscuro" onClick={() => backupRef.current?.click()}>Cargar respaldo</Boton>
            <Boton v="fantasma" onClick={() => { if (confirm('¿Borrar todo y volver a los datos de ejemplo?')) restaurarEjemplo() }}>Volver a datos de ejemplo</Boton></>}
          </div>
        </Tarjeta>

        <Tarjeta>
          <div className="flex justify-between items-center">
            <h2 className="font-bold">Registro de cambios</h2>
            <Boton v="fantasma" onClick={() => setVerRegistro(!verRegistro)}>{verRegistro ? 'Ocultar' : `Ver (${db.registro.length})`}</Boton>
          </div>
          {verRegistro && (
            <ul className="text-sm divide-y divide-borde max-h-96 overflow-y-auto mt-2">
              {db.registro.slice(0, 300).map((r, i) => (
                <li key={i} className="py-1.5"><span className="text-tenue">{new Date(r.t).toLocaleString('es-AR')} · {r.usuario}</span><br />{r.accion}</li>
              ))}
              {!db.registro.length && <li className="text-tenue py-1">Sin cambios todavía.</li>}
            </ul>
          )}
        </Tarjeta>
      </div>
    </>
  )
}

function FilaDivision({ d }: { d: Division }) {
  const [anios, setAnios] = useState(d.anios.join(', '))
  const [cuota, setCuota] = useState(d.cuota)
  const lista = [...new Set(anios.split(/[\s,;]+/).map(Number).filter((n) => n > 1950 && n < 2100))]
  const cambio = lista.join() !== d.anios.join() || cuota !== d.cuota
  return (
    <div className="border-t border-borde py-3">
      <div className="font-semibold mb-1">{d.nombre}</div>
      <div className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
        <div><label>Años</label><input value={anios} onChange={(e) => setAnios(e.target.value)} /></div>
        <div><label>Cuota</label><input type="number" min={0} value={cuota} onChange={(e) => setCuota(Math.max(0, Number(e.target.value)))} /></div>
        <Boton disabled={!cambio || !lista.length} onClick={() => actualizar((db) => {
          const x = db.divisiones.find((y) => y.id === d.id)!
          x.anios = lista
          x.cuota = cuota
        }, `${d.nombre}: años ${lista.join(', ')} · cuota ${pesos(cuota)}`)}>Guardar</Boton>
      </div>
    </div>
  )
}
