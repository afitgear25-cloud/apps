import { NavLink, Outlet } from 'react-router-dom'
import { cerrarSesion, useDB, useUsuario } from '../data/store'
import { MENU, NOMBRE_ROL } from '../lib/permisos'
import { Escudo } from './ui'

export function Layout() {
  const db = useDB()
  const u = useUsuario()!
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-negro border-b-4 border-rojo sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Escudo src={db.config.escudo} className="w-11 h-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-black text-lg leading-tight truncate uppercase tracking-wide">{db.config.clubNombre}</div>
            <div className="text-xs text-tenue truncate">
              <span className="text-rojo-claro font-semibold">{NOMBRE_ROL[u.rol]}</span> · {u.nombre} · Temporada {db.config.temporada}
            </div>
          </div>
          <button onClick={cerrarSesion} className="text-sm text-tenue hover:text-white border border-borde rounded-lg px-3 py-1.5">Salir</button>
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
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-tenue py-4 border-t border-borde">
        Los datos se guardan en este dispositivo · Exportá a Excel para tener respaldo
      </footer>
    </div>
  )
}
