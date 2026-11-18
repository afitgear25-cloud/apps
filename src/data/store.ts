/**
 * Única capa de datos de la app. Hoy guarda en el dispositivo (localStorage);
 * para pasar a la nube se reemplaza este módulo sin tocar las pantallas.
 */
import { useSyncExternalStore } from 'react'
import type { DB, Usuario } from './types'
import { crearSeed } from './seed'

const KEY = 'club-db-v1'
const KEY_SESION = 'club-sesion-v1'

let db: DB = cargar()
let sesion: string | null = leerSesion()
const subs = new Set<() => void>()

function cargar(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as DB
  } catch {
    /* sin almacenamiento: se usa el seed en memoria */
  }
  return crearSeed()
}

function leerSesion() {
  try {
    return localStorage.getItem(KEY_SESION)
  } catch {
    return null
  }
}

function guardar() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch (e) {
    alert('No hay más espacio en este dispositivo para guardar. Probá con fotos más chicas o borrá algunas.')
    throw e
  }
}

const avisar = () => subs.forEach((f) => f())
const subscribe = (f: () => void) => {
  subs.add(f)
  return () => subs.delete(f)
}

export const useDB = () => useSyncExternalStore(subscribe, () => db)
export const getDB = () => db

/** Aplica un cambio sobre una copia, lo guarda y lo deja anotado en el registro. */
export function actualizar(cambio: (d: DB) => void, accion?: string) {
  const copia: DB = structuredClone(db)
  cambio(copia)
  if (accion) {
    copia.registro.unshift({ t: new Date().toISOString(), usuario: usuarioActual()?.nombre ?? '—', accion })
    copia.registro.length = Math.min(copia.registro.length, 1000)
  }
  const anterior = db
  db = copia
  try {
    guardar()
  } catch {
    db = anterior
    return
  }
  avisar()
}

export function reemplazarTodo(nuevo: DB) {
  db = nuevo
  guardar()
  avisar()
}

export function restaurarEjemplo() {
  reemplazarTodo(crearSeed())
}

// ---- sesión ----
export function usuarioActual(): Usuario | undefined {
  return sesion ? db.usuarios.find((u) => u.id === sesion && u.activo) : undefined
}
export const useUsuario = () => {
  const d = useDB()
  const s = useSyncExternalStore(subscribe, () => sesion)
  return s ? d.usuarios.find((u) => u.id === s && u.activo) : undefined
}
export function iniciarSesion(id: string) {
  sesion = id
  try {
    localStorage.setItem(KEY_SESION, id)
  } catch {
    /* ignorar */
  }
  avisar()
}
export function cerrarSesion() {
  sesion = null
  try {
    localStorage.removeItem(KEY_SESION)
  } catch {
    /* ignorar */
  }
  avisar()
}
