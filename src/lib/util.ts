export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

const pad = (n: number) => String(n).padStart(2, '0')
export const hoy = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const mesActual = () => hoy().slice(0, 7)
export const isoFecha = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseFecha = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d || 1)
}

export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export const fechaLarga = (s: string) => {
  const d = parseFecha(s)
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()}`
}
export const nombreMes = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return `${MESES[m - 1]} ${y}`
}
export const sumarMes = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
/** Meses desde `desde` hasta `hasta` inclusive (YYYY-MM). */
export const rangoMeses = (desde: string, hasta: string) => {
  const out: string[] = []
  let m = desde
  while (m <= hasta && out.length < 240) {
    out.push(m)
    m = sumarMes(m, 1)
  }
  return out
}

export const pesos = (n: number) => '$ ' + n.toLocaleString('es-AR')

/** Hash simple (cyrb53). En modo local no hay seguridad real: evita guardar contraseñas en texto plano. */
export const hashPass = (str: string, seed = 7) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

const PALETA = ['#c8102e', '#f5f5f5', '#e85d75', '#8b0000', '#ff8a8a', '#bdbdbd', '#ff4d4d', '#7a7a7a', '#ffb3b3', '#a01020']
export const colorDe = (id: string) => {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETA[h % PALETA.length]
}
/** Texto legible sobre un color de fondo. */
export const textoSobre = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  const l = ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114
  return l > 150 ? '#0b0b0c' : '#ffffff'
}
