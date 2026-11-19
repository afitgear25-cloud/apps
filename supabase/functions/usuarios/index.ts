// Alta y edición de usuarios del club. Solo coordinación puede usarla.
// Acción especial `inicializar`: crea el primer usuario de coordinación cuando todavía no hay ninguno.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const DOMINIO = 'club.local'
const ROLES = ['coordinacion', 'administracion', 'entrenador']
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const error = (mensaje: string, status = 400) => responder({ error: mensaje }, status)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return error('Método no permitido', 405)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return error('Pedido inválido')
  }

  const usuario = String(body.usuario ?? '').trim().toLowerCase()
  const nombre = String(body.nombre ?? '').trim()
  const password = body.password ? String(body.password) : ''
  const rol = String(body.rol ?? '')
  const equipos = Array.isArray(body.equipos) ? body.equipos.map(String).slice(0, 50) : []
  const validarDatos = (conPassword: boolean) => {
    if (!/^[a-z0-9._-]{2,40}$/.test(usuario)) return 'El usuario solo puede tener letras, números, punto, guion (2 a 40).'
    if (nombre.length < 2 || nombre.length > 80) return 'Falta el nombre.'
    if (!ROLES.includes(rol)) return 'Área inválida.'
    if ((conPassword || password) && password.length < 6) return 'La contraseña tiene que tener al menos 6 caracteres.'
    return null
  }

  // Primer usuario: solo si no existe ningún perfil.
  if (body.accion === 'inicializar') {
    const { count } = await admin.from('perfiles').select('id', { count: 'exact', head: true })
    if ((count ?? 0) > 0) return error('El club ya tiene usuarios.', 403)
    if (rol !== 'coordinacion') return error('El primer usuario tiene que ser de coordinación.')
    const v = validarDatos(true)
    if (v) return error(v)
    return crear()
  }

  // El resto requiere ser coordinación.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: quien } = await admin.auth.getUser(token)
  if (!quien?.user) return error('Sesión vencida. Volvé a ingresar.', 401)
  const { data: yo } = await admin.from('perfiles').select('rol, activo').eq('id', quien.user.id).single()
  if (!yo || !yo.activo || yo.rol !== 'coordinacion') return error('Solo coordinación puede administrar usuarios.', 403)

  if (body.accion === 'crear') {
    const v = validarDatos(true)
    if (v) return error(v)
    return crear()
  }

  if (body.accion === 'editar') {
    const id = String(body.id ?? '')
    const v = validarDatos(false)
    if (v) return error(v)
    const activo = body.activo !== false
    if (id === quien.user.id && (!activo || rol !== 'coordinacion')) return error('No podés quitarte el acceso de coordinación a vos mismo.')
    const { data: actual } = await admin.from('perfiles').select('usuario').eq('id', id).single()
    if (!actual) return error('Usuario no encontrado.', 404)
    const cambiosAuth: Record<string, unknown> = { ban_duration: activo ? 'none' : '876000h' }
    if (password) cambiosAuth.password = password
    if (usuario !== actual.usuario) cambiosAuth.email = `${usuario}@${DOMINIO}`
    const { error: eAuth } = await admin.auth.admin.updateUserById(id, cambiosAuth)
    if (eAuth) return error(eAuth.message.includes('already') ? 'Ese usuario ya existe.' : eAuth.message)
    const { error: ePerfil } = await admin
      .from('perfiles')
      .update({ usuario, nombre, rol, equipos: rol === 'entrenador' ? equipos : [], activo })
      .eq('id', id)
    if (ePerfil) return error(ePerfil.message.includes('duplicate') ? 'Ese usuario ya existe.' : ePerfil.message)
    return responder({ ok: true })
  }

  return error('Acción desconocida')

  async function crear() {
    const { data, error: eAuth } = await admin.auth.admin.createUser({
      email: `${usuario}@${DOMINIO}`,
      password,
      email_confirm: true,
    })
    if (eAuth || !data.user) return error(eAuth?.message.includes('already') ? 'Ese usuario ya existe.' : eAuth?.message ?? 'No se pudo crear')
    const { error: ePerfil } = await admin.from('perfiles').insert({
      id: data.user.id,
      usuario,
      nombre,
      rol,
      equipos: rol === 'entrenador' ? equipos : [],
    })
    if (ePerfil) {
      await admin.auth.admin.deleteUser(data.user.id)
      return error(ePerfil.message.includes('duplicate') ? 'Ese usuario ya existe.' : ePerfil.message)
    }
    return responder({ ok: true, id: data.user.id })
  }
})
