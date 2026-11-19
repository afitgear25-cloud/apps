/**
 * Conexión con Supabase: carga inicial, cola de cambios (funciona sin señal), tiempo real y fotos.
 * Si no hay VITE_SUPABASE_URL / VITE_SUPABASE_KEY, la app funciona en modo local (datos de ejemplo).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { DB, Registro, Usuario } from './types'

const URL_SB = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY_SB = import.meta.env.VITE_SUPABASE_KEY as string | undefined
export const enNube = !!(URL_SB && KEY_SB)
export const sb: SupabaseClient | null = enNube
  ? createClient(URL_SB!, KEY_SB!, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'club-auth' } })
  : null
export const DOMINIO = 'club.local'

export const LISTAS = ['divisiones', 'jugadores', 'asistencias', 'pagos', 'prendas', 'materiales', 'prestamos', 'canchas', 'asignaciones', 'eventos'] as const
type Lista = (typeof LISTAS)[number]

export type Op =
  | { t: string; tipo: 'upsert'; fila: { id: string; data: unknown } }
  | { t: string; tipo: 'delete'; fila: { id: string } }
  | { t: 'registro'; tipo: 'insert'; fila: { usuario: string; accion: string } }

const porId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]))

/** Qué filas cambiaron entre dos versiones de los datos. */
export function diferencias(viejo: DB, nuevo: DB): Op[] {
  const ops: Op[] = []
  for (const t of LISTAS) {
    const a = porId(viejo[t] as { id: string }[])
    const b = porId(nuevo[t] as { id: string }[])
    for (const [id, x] of b) if (JSON.stringify(a.get(id)) !== JSON.stringify(x)) ops.push({ t, tipo: 'upsert', fila: { id, data: x } })
    for (const id of a.keys()) if (!b.has(id)) ops.push({ t, tipo: 'delete', fila: { id } })
  }
  for (const [id, e] of Object.entries(nuevo.ropa)) if (viejo.ropa[id] !== e) ops.push({ t: 'ropa', tipo: 'upsert', fila: { id, data: e } })
  for (const id of Object.keys(viejo.ropa)) if (!(id in nuevo.ropa)) ops.push({ t: 'ropa', tipo: 'delete', fila: { id } })
  if (JSON.stringify(viejo.config) !== JSON.stringify(nuevo.config)) ops.push({ t: 'config', tipo: 'upsert', fila: { id: 'club', data: nuevo.config } })
  return ops
}

/** Aplica sobre los datos en memoria un cambio que vino del servidor (o uno pendiente propio). */
export function aplicarFila(d: DB, t: string, tipo: 'upsert' | 'delete' | 'insert', fila: Record<string, unknown>) {
  if ((LISTAS as readonly string[]).includes(t)) {
    const lista = d[t as Lista] as { id: string }[]
    const i = lista.findIndex((x) => x.id === fila.id)
    if (tipo === 'delete') {
      if (i >= 0) lista.splice(i, 1)
    } else if (fila.data) {
      if (i >= 0) lista[i] = fila.data as { id: string }
      else lista.push(fila.data as { id: string })
    }
  } else if (t === 'ropa') {
    if (tipo === 'delete') delete d.ropa[String(fila.id)]
    else d.ropa[String(fila.id)] = fila.data as DB['ropa'][string]
  } else if (t === 'config' && tipo !== 'delete' && fila.data) {
    d.config = fila.data as DB['config']
  } else if (t === 'registro' && tipo === 'insert') {
    if (!d.registro.some((r) => r.t === fila.t && r.accion === fila.accion)) d.registro.unshift(filaRegistro(fila))
  } else if (t === 'perfiles') {
    const i = d.usuarios.findIndex((u) => u.id === fila.id)
    if (tipo === 'delete') {
      if (i >= 0) d.usuarios.splice(i, 1)
    } else {
      const u = filaPerfil(fila)
      if (i >= 0) d.usuarios[i] = u
      else d.usuarios.push(u)
    }
  }
}

const filaRegistro = (f: Record<string, unknown>): Registro => ({ t: String(f.t), usuario: String(f.usuario), accion: String(f.accion) })
const filaPerfil = (f: Record<string, unknown>): Usuario => ({
  id: String(f.id),
  nombre: String(f.nombre),
  usuario: String(f.usuario),
  rol: f.rol as Usuario['rol'],
  equipos: (f.equipos as string[]) ?? [],
  activo: !!f.activo,
  passHash: '',
})

async function todas(t: string) {
  const out: Record<string, unknown>[] = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await sb!.from(t).select('id, data').order('id').range(desde, desde + 999)
    if (error) throw error
    out.push(...data)
    if (data.length < 1000) return out
  }
}

/** Baja todo lo que el usuario puede ver (los permisos los aplica la base). */
export async function cargarTodo(base: DB): Promise<DB> {
  const d: DB = structuredClone(base)
  const [listas, ropa, config, perfiles, registro] = await Promise.all([
    Promise.all(LISTAS.map((t) => todas(t))),
    todas('ropa'),
    sb!.from('config').select('id, data').eq('id', 'club').maybeSingle(),
    sb!.from('perfiles').select('*'),
    sb!.from('registro').select('t, usuario, accion').order('t', { ascending: false }).limit(500),
  ])
  LISTAS.forEach((t, i) => { (d[t] as unknown[]) = listas[i].map((f) => f.data) })
  d.ropa = Object.fromEntries(ropa.map((f) => [String(f.id), f.data as DB['ropa'][string]]))
  if (config.data) d.config = config.data.data as DB['config']
  if (perfiles.error) throw perfiles.error
  d.usuarios = (perfiles.data ?? []).map(filaPerfil)
  d.registro = (registro.data ?? []).map(filaRegistro)
  return d
}

export async function cargarConfigPublica(): Promise<DB['config'] | null> {
  const { data } = await sb!.from('config').select('data').eq('id', 'club').maybeSingle()
  return (data?.data as DB['config']) ?? null
}

/** Ejecuta en el servidor las operaciones pendientes, agrupando las que se pueden mandar juntas. */
export async function ejecutar(ops: Op[]): Promise<{ hechas: number; error?: { red: boolean; mensaje: string } }> {
  let hechas = 0
  while (hechas < ops.length) {
    const op = ops[hechas]
    let grupo = 1
    let res
    if (op.tipo === 'upsert') {
      while (grupo < 500 && ops[hechas + grupo]?.t === op.t && ops[hechas + grupo].tipo === 'upsert') grupo++
      const filas = new Map(ops.slice(hechas, hechas + grupo).map((o) => [(o.fila as { id: string }).id, o.fila]))
      res = await sb!.from(op.t).upsert([...filas.values()])
    } else if (op.tipo === 'delete') {
      res = await sb!.from(op.t).delete().eq('id', op.fila.id)
    } else {
      res = await sb!.from('registro').insert(op.fila)
    }
    if (res.error) {
      const red = !navigator.onLine || /fetch|network|Load failed/i.test(res.error.message)
      return { hechas, error: { red, mensaje: res.error.message } }
    }
    hechas += grupo
  }
  return { hechas }
}

// ---- fotos ----
const dataUrlABlob = async (u: string) => (await fetch(u)).blob()

export async function subirFoto(dataUrl: string, carpeta: string): Promise<string> {
  if (!sb || !navigator.onLine) return dataUrl
  try {
    const ruta = `${carpeta}/${crypto.randomUUID()}.jpg`
    const { error } = await sb.storage.from('fotos').upload(ruta, await dataUrlABlob(dataUrl), { contentType: 'image/jpeg' })
    return error ? dataUrl : `sb:${ruta}`
  } catch {
    return dataUrl
  }
}

export async function subirEscudo(dataUrl: string): Promise<string> {
  if (!sb) return dataUrl
  const blob = await dataUrlABlob(dataUrl)
  const ext = blob.type === 'image/svg+xml' ? 'svg' : 'png'
  const ruta = `escudo-${Date.now()}.${ext}`
  const { error } = await sb.storage.from('publico').upload(ruta, blob, { contentType: blob.type, upsert: true })
  if (error) throw error
  return sb.storage.from('publico').getPublicUrl(ruta).data.publicUrl
}

const urls = new Map<string, { url: string; vence: number }>()
const esperando = new Map<string, ((u: string) => void)[]>()
let timer: ReturnType<typeof setTimeout> | null = null

/** Convierte una referencia `sb:ruta` en un link temporal para mostrar la foto (en lotes). */
export function urlDeFoto(ref: string): string | Promise<string> {
  const ruta = ref.slice(3)
  const c = urls.get(ruta)
  if (c && c.vence > Date.now()) return c.url
  return new Promise((res) => {
    esperando.set(ruta, [...(esperando.get(ruta) ?? []), res])
    if (!timer) timer = setTimeout(pedirLote, 40)
  })
}

async function pedirLote() {
  timer = null
  const rutas = [...esperando.keys()]
  const listeners = new Map(esperando)
  esperando.clear()
  const { data } = await sb!.storage.from('fotos').createSignedUrls(rutas, 60 * 60 * 12)
  for (const r of rutas) {
    const url = data?.find((x) => x.path === r)?.signedUrl ?? ''
    if (url) urls.set(r, { url, vence: Date.now() + 60 * 60 * 11 * 1000 })
    listeners.get(r)?.forEach((f) => f(url))
  }
}
