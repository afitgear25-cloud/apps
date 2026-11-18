import type { Rol, Usuario } from '../data/types'

export type Area =
  | 'tablero' | 'plantel' | 'jugadores' | 'equipo' | 'calendario' | 'calendario-editar' | 'canchas'
  | 'materiales' | 'materiales-editar' | 'cuotas' | 'ropa' | 'matriculados' | 'exportar' | 'usuarios' | 'ajustes'

const PERMISOS: Record<Rol, Area[]> = {
  coordinacion: ['tablero', 'plantel', 'jugadores', 'equipo', 'calendario', 'calendario-editar', 'canchas', 'materiales', 'materiales-editar', 'cuotas', 'ropa', 'matriculados', 'exportar', 'usuarios', 'ajustes'],
  administracion: ['cuotas', 'ropa', 'matriculados', 'exportar'],
  entrenador: ['equipo', 'calendario', 'canchas', 'materiales'],
}

export const puede = (u: Usuario | undefined, a: Area) => !!u && PERMISOS[u.rol].includes(a)

/** Coordinación ve todos los equipos; el entrenador, solo los suyos. */
export const veEquipo = (u: Usuario | undefined, equipoId: string) =>
  !!u && (u.rol === 'coordinacion' || (u.rol === 'entrenador' && u.equipos.includes(equipoId)))

export const NOMBRE_ROL: Record<Rol, string> = {
  coordinacion: 'Coordinación',
  administracion: 'Administración',
  entrenador: 'Entrenador',
}

export const MENU: Record<Rol, { a: string; texto: string }[]> = {
  coordinacion: [
    { a: '/', texto: 'Tablero' },
    { a: '/plantel', texto: 'Divisiones' },
    { a: '/jugadores', texto: 'Jugadores' },
    { a: '/calendario', texto: 'Calendario' },
    { a: '/canchas', texto: 'Canchas' },
    { a: '/materiales', texto: 'Materiales' },
    { a: '/cuotas', texto: 'Cuotas' },
    { a: '/ropa', texto: 'Ropa' },
    { a: '/matriculados', texto: 'Matriculados' },
    { a: '/exportar', texto: 'Excel' },
    { a: '/usuarios', texto: 'Usuarios' },
    { a: '/ajustes', texto: 'Ajustes' },
  ],
  administracion: [
    { a: '/', texto: 'Resumen' },
    { a: '/cuotas', texto: 'Cuotas' },
    { a: '/ropa', texto: 'Ropa' },
    { a: '/matriculados', texto: 'Matriculados' },
    { a: '/exportar', texto: 'Excel' },
  ],
  entrenador: [
    { a: '/', texto: 'Mis equipos' },
    { a: '/calendario', texto: 'Calendario' },
    { a: '/canchas', texto: 'Canchas' },
    { a: '/materiales', texto: 'Materiales' },
  ],
}
