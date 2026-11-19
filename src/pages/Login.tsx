import { useState } from 'react'
import { enNube, ingresar, useDB } from '../data/store'
import type { Rol } from '../data/types'
import { NOMBRE_ROL } from '../lib/permisos'
import { Boton, Escudo } from '../components/ui'

const ROLES: { rol: Rol; desc: string }[] = [
  { rol: 'coordinacion', desc: 'Todo el club' },
  { rol: 'administracion', desc: 'Cuotas, ropa y matriculados' },
  { rol: 'entrenador', desc: 'Asistencia, materiales y cancha' },
]

export function Login() {
  const db = useDB()
  const [rol, setRol] = useState<Rol | null>(null)
  const [usuario, setUsuario] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rol) return
    setEntrando(true)
    const err = await ingresar(rol, usuario, pass)
    setEntrando(false)
    if (err) setError(err)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-[radial-gradient(circle_at_top,#3a0710_0%,#0b0b0c_60%)]">
      <Escudo src={db.config.escudo} className="w-28 h-28 mb-3 drop-shadow-[0_0_25px_rgba(200,16,46,0.45)]" />
      <h1 className="text-3xl font-black uppercase tracking-wide text-center">{db.config.clubNombre}</h1>
      <p className="text-tenue mb-8">Gestión del club · Temporada {db.config.temporada}</p>

      <div className="w-full max-w-sm">
        {!rol ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-tenue text-center mb-1">¿Cómo ingresás?</p>
            {ROLES.map((r) => (
              <button
                key={r.rol}
                onClick={() => { setRol(r.rol); setError(''); setUsuario(!enNube && r.rol === 'coordinacion' ? 'coordinador' : !enNube && r.rol === 'administracion' ? 'admin' : '') }}
                className="group bg-panel border border-borde hover:border-rojo rounded-2xl px-5 py-4 text-left transition"
              >
                <div className="text-lg font-bold group-hover:text-rojo-claro">{NOMBRE_ROL[r.rol]}</div>
                <div className="text-sm text-tenue">{r.desc}</div>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={entrar} className="bg-panel border border-borde rounded-2xl p-5">
            <div className="text-xs uppercase tracking-widest text-rojo-claro font-bold mb-3">{NOMBRE_ROL[rol]}</div>
            <label htmlFor="usuario">Usuario</label>
            <input id="usuario" autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} className="mb-3" autoCapitalize="none" autoFocus={enNube || rol === 'entrenador'} />
            <label htmlFor="pass">Contraseña</label>
            <input id="pass" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} autoFocus={!enNube && rol !== 'entrenador'} />
            {error && <p className="text-rojo-claro text-sm mt-3">{error}</p>}
            <Boton grande className="w-full mt-4" type="submit" disabled={entrando || !usuario || !pass}>{entrando ? 'Ingresando…' : 'Ingresar'}</Boton>
            <Boton type="button" v="fantasma" className="w-full mt-2" onClick={() => { setRol(null); setPass('') }}>← Volver</Boton>
          </form>
        )}
        {!enNube && (
          <p className="text-xs text-tenue text-center mt-6">
            Modo prueba: coordinador / admin / martin, laura o diego — contraseña <b>1234</b>
          </p>
        )}
      </div>
    </div>
  )
}
