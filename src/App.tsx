import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useUsuario } from './data/store'
import { puede, type Area } from './lib/permisos'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Tablero } from './pages/Tablero'
import { ResumenAdmin } from './pages/ResumenAdmin'
import { MisEquipos } from './pages/MisEquipos'
import { Divisiones, DivisionDetalle } from './pages/Divisiones'
import { EquipoPage } from './pages/Equipo'
import { Jugadores, JugadorForm } from './pages/Jugadores'
import { Calendario } from './pages/Calendario'
import { Canchas } from './pages/Canchas'
import { Materiales } from './pages/Materiales'
import { Cuotas } from './pages/Cuotas'
import { Ropa } from './pages/Ropa'
import { Matriculados } from './pages/Matriculados'
import { Exportar } from './pages/Exportar'
import { Usuarios } from './pages/Usuarios'
import { Ajustes } from './pages/Ajustes'

function Solo({ area, children }: { area: Area; children: ReactNode }) {
  const u = useUsuario()
  return puede(u, area) ? <>{children}</> : <Navigate to="/" replace />
}

function Inicio() {
  const u = useUsuario()!
  if (u.rol === 'coordinacion') return <Tablero />
  if (u.rol === 'administracion') return <ResumenAdmin />
  return <MisEquipos />
}

export default function App() {
  const u = useUsuario()
  if (!u) return <Login />
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="plantel" element={<Solo area="plantel"><Divisiones /></Solo>} />
          <Route path="plantel/:divId" element={<Solo area="plantel"><DivisionDetalle /></Solo>} />
          <Route path="equipo/:id" element={<Solo area="equipo"><EquipoPage /></Solo>} />
          <Route path="jugadores" element={<Solo area="jugadores"><Jugadores /></Solo>} />
          <Route path="jugadores/:id" element={<Solo area="jugadores"><JugadorForm /></Solo>} />
          <Route path="calendario" element={<Solo area="calendario"><Calendario /></Solo>} />
          <Route path="canchas" element={<Solo area="canchas"><Canchas /></Solo>} />
          <Route path="materiales" element={<Solo area="materiales"><Materiales /></Solo>} />
          <Route path="cuotas" element={<Solo area="cuotas"><Cuotas /></Solo>} />
          <Route path="ropa" element={<Solo area="ropa"><Ropa /></Solo>} />
          <Route path="matriculados" element={<Solo area="matriculados"><Matriculados /></Solo>} />
          <Route path="exportar" element={<Solo area="exportar"><Exportar /></Solo>} />
          <Route path="usuarios" element={<Solo area="usuarios"><Usuarios /></Solo>} />
          <Route path="ajustes" element={<Solo area="ajustes"><Ajustes /></Solo>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
