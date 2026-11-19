import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { cambiarMiPassword, cerrarError, cerrarSesion, enNube, useDB, useEstadoNube, useUsuario } from '../data/store'
import { MENU, NOMBRE_ROL } from '../lib/permisos'
import { Boton, Campo, Escudo, Modal } from './ui'

function EstadoNube() {
  const e = useEstadoNube()
  if (!enNube) return null
  if (!e.online) return <span className="text-xs font-semibold text-amber-300 bg-amber-400/15 border border-amber-400/40 rounded-full px-2 py-0.5 whitespace-nowrap">Sin conexión{e.pendientes ? ` · ${e.pendientes} por subir` : ''}</span>
  if (e.pendientes) return <span className="text-xs font-semibold text-tenue border border-borde rounded-full px-2 py-0.5 whitespace-nowrap">Subiendo {e.pendientes}…</span>
  return <span className="text-xs text-emerald-300 whitespace-nowrap" title="Datos al día">● En línea</span>
}

function MiPassword({ onClose }: { onClose: () => void }) {
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)
  return (
    <Modal titulo="Cambiar mi contraseña" onClose={onClose}>
      {ok ? <p className="text-emerald-300 mb-3">Listo, la próxima vez entrás con la nueva contraseña.</p> : <>
        <Campo label="Nueva contraseña (mínimo 6)"><input type="password" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} /></Campo>
        <Campo label="Repetila"><input type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} /></Campo>
        {msg && <p className="text-rojo-claro text-sm mb-2">{msg}</p>}
        <Boton grande className="w-full" disabled={p1.length < 6 || p1 !== p2} onClick={async () => {
          const err = await cambiarMiPassword(p1)
          if (err) setMsg(err)
          else setOk(true)
        }}>Guardar</Boton>
      </>}
      {ok && <Boton grande className="w-full" onClick={onClose}>Cerrar</Boton>}
    </Modal>
  )
}

export function Layout() {
  const db = useDB()
  const u = useUsuario()!
  const estado = useEstadoNube()
  const [pass, setPass] = useState(false)
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-negro border-b-4 border-rojo sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Escudo src={db.config.escudo} className="w-11 h-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-black text-lg leading-tight truncate uppercase tracking-wide">{db.config.clubNombre}</div>
            <div className="text-xs text-tenue truncate">
              <span className="text-rojo-claro font-semibold">{NOMBRE_ROL[u.rol]}</span> · <button className="hover:text-white underline-offset-2 hover:underline" onClick={() => setPass(true)} title="Cambiar mi contraseña">{u.nombre}</button> · Temporada {db.config.temporada}
            </div>
            <EstadoNube />
          </div>
          <button onClick={() => void cerrarSesion()} className="text-sm text-tenue hover:text-white border border-borde rounded-lg px-3 py-1.5">Salir</button>
        </div>
        <nav className="max-w-6xl mx-auto px-2 pb-2 flex gap-1 overflow-x-auto">
          {MENU[u.rol].map((m) => (
            <NavLink
              key={m.a}
              to={m.a}
              end={m.a === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap ${isActive ? 'bg-rojo text-white' : 'text-zinc-300 hover:bg-panel-2'}`
              }
            >
              {m.texto}
            </NavLink>
          ))}
        </nav>
      </header>
      {estado.error && (
        <div className="bg-amber-400/15 border-b border-amber-400/40 text-amber-200 text-sm">
          <div className="max-w-6xl mx-auto px-4 py-2 flex gap-3 items-center"><span className="flex-1">{estado.error}</span><button onClick={cerrarError} className="font-bold">×</button></div>
        </div>
      )}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-tenue py-4 border-t border-borde">
        {enNube ? 'Datos compartidos en la nube · funciona sin señal y sube los cambios al reconectar' : 'Modo prueba: los datos se guardan solo en este dispositivo'}
      </footer>
      {pass && <MiPassword onClose={() => setPass(false)} />}
    </div>
  )
}
