import { useState } from 'react'
import { enNube, guardarUsuario, useDB, useUsuario } from '../data/store'
import type { DB, Rol, Usuario } from '../data/types'
import { equipos, nombreEquipo } from '../data/logic'
import { NOMBRE_ROL } from '../lib/permisos'
import { uid } from '../lib/util'
import { Boton, Campo, Chip, Modal, Titulo } from '../components/ui'

export function Usuarios() {
  const db = useDB()
  const [form, setForm] = useState<Usuario | null>(null)
  return (
    <>
      <Titulo sub="Cada persona entra con su usuario y contraseña." extra={<Boton onClick={() => setForm({ id: '', nombre: '', usuario: '', rol: 'entrenador', passHash: '', equipos: [], activo: true })}>+ Nuevo usuario</Boton>}>Usuarios</Titulo>
      {(['coordinacion', 'administracion', 'entrenador'] as Rol[]).map((rol) => (
        <div key={rol} className="mb-5">
          <h2 className="font-bold mb-2">{NOMBRE_ROL[rol]}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {db.usuarios.filter((u) => u.rol === rol).map((u) => (
              <button key={u.id} onClick={() => setForm(structuredClone(u))} className={`text-left bg-panel border border-borde hover:border-rojo rounded-xl p-3 ${u.activo ? '' : 'opacity-50'}`}>
                <div className="font-semibold">{u.nombre} {!u.activo && <Chip>Sin acceso</Chip>}</div>
                <div className="text-xs text-tenue">usuario: {u.usuario}</div>
                {rol === 'entrenador' && <div className="text-xs text-tenue mt-1">{u.equipos.length ? u.equipos.map((e) => nombreEquipo(db, e)).join(', ') : 'Sin equipos'}</div>}
              </button>
            ))}
          </div>
        </div>
      ))}
      {form && <FormUsuario db={db} inicial={form} onClose={() => setForm(null)} />}
    </>
  )
}

function FormUsuario({ db, inicial, onClose }: { db: DB; inicial: Usuario; onClose: () => void }) {
  const yo = useUsuario()!
  const [u, setU] = useState(inicial)
  const [pass, setPass] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const minimo = enNube ? 6 : 4
  const set = <K extends keyof Usuario>(k: K, v: Usuario[K]) => setU((x) => ({ ...x, [k]: v }))
  const repetido = db.usuarios.some((x) => x.id !== u.id && x.usuario.toLowerCase() === u.usuario.trim().toLowerCase())
  const valido = u.nombre.trim() && u.usuario.trim() && !repetido && (inicial.id || pass.length >= minimo) && (!pass || pass.length >= minimo)
  const soyYo = inicial.id === yo.id
  return (
    <Modal titulo={inicial.id ? 'Editar usuario' : 'Nuevo usuario'} onClose={onClose}>
      <Campo label="Nombre (como se va a ver)"><input value={u.nombre} placeholder="Ej.: Prof. Martín" onChange={(e) => set('nombre', e.target.value)} /></Campo>
      <Campo label="Usuario para ingresar"><input value={u.usuario} autoCapitalize="none" onChange={(e) => set('usuario', e.target.value.replace(/\s/g, '').toLowerCase())} /></Campo>
      {repetido && <p className="text-rojo-claro text-sm -mt-2 mb-2">Ese usuario ya existe.</p>}
      <Campo label={inicial.id ? 'Nueva contraseña (dejar vacío para no cambiarla)' : `Contraseña (mínimo ${minimo} caracteres)`}><input type="text" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" /></Campo>
      <Campo label="Área">
        <div className="flex gap-1.5">
          {(['coordinacion', 'administracion', 'entrenador'] as Rol[]).map((r) => (
            <button key={r} disabled={soyYo} onClick={() => set('rol', r)} className={`flex-1 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50 ${u.rol === r ? 'bg-rojo border-rojo' : 'border-borde text-tenue'}`}>{NOMBRE_ROL[r]}</button>
          ))}
        </div>
      </Campo>
      {u.rol === 'entrenador' && (
        <Campo label="Equipos a cargo">
          <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
            {[...db.divisiones].sort((a, b) => a.orden - b.orden).map((d) => (
              <div key={d.id}>
                <div className="text-xs text-tenue mb-1">{d.nombre}</div>
                <div className="flex flex-wrap gap-1">
                  {equipos(db).filter((e) => e.divisionId === d.id).map((e) => {
                    const on = u.equipos.includes(e.id)
                    return <button key={e.id} onClick={() => set('equipos', on ? u.equipos.filter((x) => x !== e.id) : [...u.equipos, e.id])} className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold ${on ? 'bg-rojo border-rojo' : 'border-borde text-tenue'}`}>{e.anio}</button>
                  })}
                </div>
              </div>
            ))}
          </div>
        </Campo>
      )}
      {!soyYo && <label className="flex items-center gap-2 text-sm text-white mb-3"><input type="checkbox" checked={u.activo} onChange={(e) => set('activo', e.target.checked)} /> Puede ingresar</label>}
      {msg && <p className="text-rojo-claro text-sm mb-2">{msg}</p>}
      <Boton grande className="w-full" disabled={!valido || guardando} onClick={async () => {
        const nuevo: Usuario = { ...u, id: u.id || uid(), nombre: u.nombre.trim(), usuario: u.usuario.trim(), equipos: u.rol === 'entrenador' ? u.equipos : [] }
        setGuardando(true)
        const err = await guardarUsuario(nuevo, pass, !inicial.id)
        setGuardando(false)
        if (err) setMsg(err)
        else onClose()
      }}>{guardando ? 'Guardando…' : 'Guardar'}</Boton>
    </Modal>
  )
}
