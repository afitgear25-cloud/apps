/**
 * Única capa de datos de la app. Las pantallas usan `useDB`, `actualizar` y `useUsuario`.
 * - Modo nube (Supabase): datos compartidos, copia en el dispositivo y cola de cambios sin señal.
 * - Modo local (sin configuración): todo en el dispositivo, con datos de ejemplo.
 */
import { useSyncExternalStore } from 'react'
import type { DB, Rol, Usuario } from './types'
import { crearSeed } from './seed'
import { aplicarFila, cargarConfigPublica, cargarTodo, diferencias, DOMINIO, ejecutar, enNube, sb, type Op } from './nube'
import { hashPass } from '../lib/util'

export { enNube }

const KEY = enNube ? 'club-cache-v1' : 'club-db-v1'
const KEY_SESION = 'club-sesion-v1'
const KEY_COLA = 'club-cola-v1'

function vacio(): DB {
  return {
    version: 1,
    config: { clubNombre: 'Club', temporada: new Date().getFullYear() },
    usuarios: [], divisiones: [], jugadores: [], asistencias: [], pagos: [], prendas: [], ropa: {},
    materiales: [], prestamos: [], canchas: [], asignaciones: [], eventos: [], registro: [],
  }
}

const leer = <T,>(k: string, def: T): T => {
  try {
    const r = localStorage.getItem(k)
    return r ? (JSON.parse(r) as T) : def
  } catch {
    return def
  }
}
const escribir = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
    return true
  } catch {
    return false
  }
}

let db: DB = leer<DB | null>(KEY, null) ?? (enNube ? vacio() : crearSeed())
let sesion: string | null = leer<string | null>(KEY_SESION, null)
let cola: Op[] = enNube ? leer<Op[]>(KEY_COLA, []) : []
let estado = { online: typeof navigator === 'undefined' ? true : navigator.onLine, pendientes: cola.length, error: '', cargando: false }

const subs = new Set<() => void>()
const avisar = () => subs.forEach((f) => f())
const subscribe = (f: () => void) => {
  subs.add(f)
  return () => subs.delete(f)
}
const setEstado = (e: Partial<typeof estado>) => {
  estado = { ...estado, ...e }
  avisar()
}

function guardarLocal() {
  if (escribir(KEY, db)) return
  if (!enNube) {
    alert('No hay más espacio en este dispositivo para guardar. Probá con fotos más chicas o borrá algunas.')
    throw new Error('sin espacio')
  }
}

export const useDB = () => useSyncExternalStore(subscribe, () => db)
export const getDB = () => db
export const useEstadoNube = () => useSyncExternalStore(subscribe, () => estado)

/** Aplica un cambio sobre una copia, lo guarda, lo sube a la nube y lo anota en el registro. */
export function actualizar(cambio: (d: DB) => void, accion?: string) {
  const anterior = db
  const copia: DB = structuredClone(db)
  cambio(copia)
  const quien = usuarioActual()?.nombre ?? '—'
  if (accion) {
    copia.registro.unshift({ t: new Date().toISOString(), usuario: quien, accion })
    copia.registro.length = Math.min(copia.registro.length, 1000)
  }
  db = copia
  try {
    guardarLocal()
  } catch {
    db = anterior
    return
  }
  if (enNube) {
    const ops = diferencias(anterior, copia)
    if (accion) ops.push({ t: 'registro', tipo: 'insert', fila: { usuario: quien, accion } })
    encolar(ops)
  }
  avisar()
}

// ---- sincronización ----
function encolar(ops: Op[]) {
  if (!ops.length) return
  cola = [...cola, ...ops]
  escribir(KEY_COLA, cola)
  setEstado({ pendientes: cola.length })
  void subir()
}

let subiendo = false
async function subir() {
  if (!sb || subiendo || !cola.length || !sesion) return
  subiendo = true
  try {
    const lote = cola.slice()
    const { hechas, error } = await ejecutar(lote)
    cola = cola.slice(hechas)
    if (error && !error.red) {
      // El servidor rechazó el cambio (por ejemplo, falta de permiso): se descarta y se vuelve a cargar.
      const rechazada = cola.shift()
      console.warn('Cambio rechazado', rechazada, error.mensaje)
      setEstado({ error: 'Un cambio no se pudo guardar (sin permiso o dato inválido). Se recargaron los datos.' })
      void recargar()
    }
    escribir(KEY_COLA, cola)
    setEstado({ pendientes: cola.length, online: error?.red ? false : navigator.onLine })
    if (!error && cola.length) setTimeout(() => void subir(), 0)
  } finally {
    subiendo = false
  }
}

export async function recargar() {
  if (!sb || !sesion) return
  setEstado({ cargando: true })
  try {
    const d = await cargarTodo(vacio())
    // Lo que todavía no se subió se vuelve a aplicar encima.
    for (const op of cola) aplicarFila(d, op.t, op.tipo, op.fila as Record<string, unknown>)
    db = d
    escribir(KEY, db)
    setEstado({ cargando: false, online: true })
  } catch (e) {
    setEstado({ cargando: false, online: navigator.onLine })
    console.warn('No se pudo cargar', e)
  }
}

let canal: ReturnType<NonNullable<typeof sb>['channel']> | null = null
function suscribir() {
  if (!sb || canal) return
  canal = sb
    .channel('club')
    .on('postgres_changes', { event: '*', schema: 'public' }, (p) => {
      const fila = (p.eventType === 'DELETE' ? p.old : p.new) as Record<string, unknown>
      const tipo = p.eventType === 'DELETE' ? 'delete' : p.table === 'registro' ? 'insert' : 'upsert'
      const copia = structuredClone(db)
      aplicarFila(copia, p.table, tipo, fila)
      db = copia
      escribir(KEY, db)
      avisar()
    })
    .subscribe((s) => {
      if (s === 'SUBSCRIBED') void recargar() // al reconectar, ponerse al día
    })
}

/** Arranque: config pública para la pantalla de ingreso y, si hay sesión, datos al día. */
export async function iniciar() {
  if (!sb) return
  window.addEventListener('online', () => { setEstado({ online: true }); void subir(); void recargar() })
  window.addEventListener('offline', () => setEstado({ online: false }))
  setInterval(() => void subir(), 30000)
  const { data } = await sb.auth.getSession().catch(() => ({ data: { session: null } }))
  const uid = data.session?.user.id
  if (!uid) {
    if (sesion) cerrarLocal()
    const c = await cargarConfigPublica().catch(() => null)
    if (c) { db = { ...db, config: c }; avisar() }
    return
  }
  sesion = uid
  suscribir()
  void subir()
  if (!navigator.onLine) return
  await recargar()
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

function fijarSesion(id: string | null) {
  sesion = id
  if (id) escribir(KEY_SESION, id)
  else try { localStorage.removeItem(KEY_SESION) } catch { /* ignorar */ }
  avisar()
}

/** Devuelve un mensaje de error, o null si entró bien. */
export async function ingresar(rol: Rol, usuario: string, pass: string): Promise<string | null> {
  const nombre = usuario.trim().toLowerCase()
  if (!sb) {
    const u = db.usuarios.find((x) => x.activo && x.rol === rol && x.usuario.toLowerCase() === nombre)
    if (!u || u.passHash !== hashPass(pass)) return 'Usuario o contraseña incorrectos'
    fijarSesion(u.id)
    return null
  }
  if (!navigator.onLine) return 'Para ingresar por primera vez hace falta conexión.'
  const { data, error } = await sb.auth.signInWithPassword({ email: `${nombre}@${DOMINIO}`, password: pass })
  if (error || !data.user) return /fetch/i.test(error?.message ?? '') ? 'Sin conexión con el servidor.' : 'Usuario o contraseña incorrectos'
  const { data: perfil } = await sb.from('perfiles').select('rol, activo').eq('id', data.user.id).maybeSingle()
  if (!perfil?.activo || perfil.rol !== rol) {
    await sb.auth.signOut()
    return perfil?.activo ? 'Ese usuario no pertenece a esta área.' : 'Usuario sin acceso. Hablá con coordinación.'
  }
  sesion = data.user.id
  await recargar()
  suscribir()
  fijarSesion(data.user.id)
  return null
}

function cerrarLocal() {
  const config = db.config
  db = { ...vacio(), config }
  cola = []
  escribir(KEY_COLA, cola)
  try { localStorage.removeItem(KEY) } catch { /* ignorar */ }
  setEstado({ pendientes: 0, error: '' })
  fijarSesion(null)
}

export async function cerrarSesion() {
  if (!sb) return fijarSesion(null)
  if (cola.length && !confirm(`Hay ${cola.length} cambios sin subir (falta conexión). Si salís ahora se pierden. ¿Salir igual?`)) return
  if (canal) { void sb.removeChannel(canal); canal = null }
  await sb.auth.signOut().catch(() => {})
  cerrarLocal()
}

// ---- usuarios ----
export async function guardarUsuario(u: Usuario, pass: string, esNuevo: boolean): Promise<string | null> {
  if (!sb) {
    const nuevo: Usuario = { ...u, passHash: pass ? hashPass(pass) : u.passHash }
    actualizar((d) => { d.usuarios = esNuevo ? [...d.usuarios, nuevo] : d.usuarios.map((x) => (x.id === nuevo.id ? nuevo : x)) },
      `${esNuevo ? 'Creó' : 'Editó'} usuario ${nuevo.usuario}`)
    return null
  }
  const { data, error } = await sb.functions.invoke('usuarios', {
    body: { accion: esNuevo ? 'crear' : 'editar', id: u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol, equipos: u.equipos, activo: u.activo, password: pass || undefined },
  })
  if (error) {
    const ctx = (error as { context?: Response }).context
    const cuerpo = ctx ? await ctx.json().catch(() => null) : null
    return cuerpo?.error ?? 'No se pudo guardar. Revisá la conexión.'
  }
  if (data?.error) return data.error
  actualizar(() => {}, `${esNuevo ? 'Creó' : 'Editó'} usuario ${u.usuario}${pass && !esNuevo ? ' y cambió su contraseña' : ''}`)
  await recargar()
  return null
}

export async function cambiarMiPassword(pass: string): Promise<string | null> {
  if (pass.length < 6) return 'La contraseña tiene que tener al menos 6 caracteres.'
  if (!sb) {
    const yo = usuarioActual()
    if (!yo) return 'Sin sesión'
    actualizar((d) => { d.usuarios.find((x) => x.id === yo.id)!.passHash = hashPass(pass) }, 'Cambió su contraseña')
    return null
  }
  const { error } = await sb.auth.updateUser({ password: pass })
  if (error) return /same/i.test(error.message) ? 'Es la misma contraseña que tenías.' : 'No se pudo cambiar. Revisá la conexión.'
  actualizar(() => {}, 'Cambió su contraseña')
  return null
}

// ---- solo modo local ----
export function reemplazarTodo(nuevo: DB) {
  db = nuevo
  guardarLocal()
  avisar()
}
export function restaurarEjemplo() {
  reemplazarTodo(crearSeed())
}
export function cerrarError() {
  setEstado({ error: '' })
}
