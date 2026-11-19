import type { Jugador } from '../data/types'
import { descargar } from './descargar'
import { mesActual, uid } from './util'

const COLS = ['Apellido', 'Nombre', 'DNI', 'Fecha de nacimiento', 'N° de ficha', 'Apto médico vence']

export async function bajarPlanillaModelo() {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Jugadores')
  ws.addRow(COLS)
  ws.addRow(['Pérez', 'Juan', '50123456', '15/03/2010', '123456', '31/12/2026'])
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8102E' } }
  ws.columns.forEach((c) => { c.width = 22 })
  const buf = await wb.xlsx.writeBuffer()
  descargar(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'planilla-jugadores.xlsx')
}

const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const pad = (n: number) => String(n).padStart(2, '0')

/** Acepta fechas de Excel, dd/mm/aaaa, dd-mm-aaaa o aaaa-mm-dd. */
function fecha(v: unknown): string {
  if (v instanceof Date && !isNaN(+v)) return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`
  const s = String(v ?? '').trim()
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    return `${y}-${pad(+m[2])}-${pad(+m[1])}`
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  return m ? `${m[1]}-${pad(+m[2])}-${pad(+m[3])}` : ''
}

const texto = (v: unknown) => {
  if (v && typeof v === 'object' && 'text' in v) return String((v as { text: unknown }).text)
  if (v && typeof v === 'object' && 'result' in v) return String((v as { result: unknown }).result)
  return String(v ?? '').trim()
}

export async function leerJugadores(file: File, existentes: Jugador[]) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ws = wb.worksheets[0]
  if (!ws) return { nuevos: [] as Jugador[], errores: ['El archivo no tiene hojas.'] }
  const encabezado = Array.from(ws.getRow(1).values as unknown[], norm)
  const col = (...nombres: string[]) => encabezado.findIndex((h) => nombres.some((n) => h.startsWith(n)))
  const cAp = col('apellido'), cNo = col('nombre'), cDni = col('dni', 'documento'), cNac = col('fecha de nac', 'nacimiento', 'fecha nac')
  const cFi = col('n° de ficha', 'nº de ficha', 'ficha', 'n de ficha'), cAp2 = col('apto')
  if (cAp < 0 || cNo < 0 || cNac < 0) return { nuevos: [], errores: ['Faltan columnas: tienen que estar al menos Apellido, Nombre y Fecha de nacimiento (usá la planilla modelo).'] }

  const dnis = new Set(existentes.map((j) => j.dni).filter(Boolean))
  const nuevos: Jugador[] = []
  const errores: string[] = []
  ws.eachRow((row, n) => {
    if (n === 1) return
    const v = row.values as unknown[]
    const apellido = texto(v[cAp]), nombre = texto(v[cNo])
    if (!apellido && !nombre) return
    const nac = fecha(v[cNac])
    const dni = cDni >= 0 ? texto(v[cDni]).replace(/\D/g, '') : ''
    if (!apellido || !nombre) return void errores.push(`Fila ${n}: falta nombre o apellido.`)
    if (!nac) return void errores.push(`Fila ${n} (${apellido}, ${nombre}): fecha de nacimiento inválida.`)
    if (dni && dnis.has(dni)) return void errores.push(`Fila ${n} (${apellido}, ${nombre}): ya existe un jugador con DNI ${dni}.`)
    if (dni) dnis.add(dni)
    nuevos.push({
      id: uid(), apellido, nombre, dni, nacimiento: nac, alta: mesActual(),
      fichaLiga: cFi >= 0 ? texto(v[cFi]) : '', aptoVence: cAp2 >= 0 ? fecha(v[cAp2]) : '',
      obs: '', activo: true, equiposExtra: [],
    })
  })
  return { nuevos, errores }
}
