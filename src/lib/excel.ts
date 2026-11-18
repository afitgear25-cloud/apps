import type { DB } from '../data/types'
import {
  cuotaDe, equipoBase, equiposDeJugador, equipos, mesesAdeudados, nombreCompleto, nombreEquipo, prestado,
} from '../data/logic'
import { DIAS, hoy, mesActual, rangoMeses } from './util'
import { descargar } from './descargar'

type Celda = string | number | null
interface Hoja {
  nombre: string
  columnas: string[]
  filas: Celda[][]
}

async function bajar(nombreArchivo: string, hojas: Hoja[]) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Gestión del Club'
  for (const h of hojas) {
    const ws = wb.addWorksheet(h.nombre.slice(0, 31))
    ws.addRow(h.columnas)
    h.filas.forEach((f) => ws.addRow(f))
    const head = ws.getRow(1)
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8102E' } }
    ws.views = [{ state: 'frozen', ySplit: 1 }]
    ws.columns.forEach((c, i) => {
      const largo = Math.max(h.columnas[i]?.length ?? 8, ...h.filas.slice(0, 200).map((f) => String(f[i] ?? '').length))
      c.width = Math.min(40, Math.max(10, largo + 2))
    })
  }
  const buf = await wb.xlsx.writeBuffer()
  descargar(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${nombreArchivo}-${hoy()}.xlsx`)
}

const ESTADO = { P: 'Presente', A: 'Ausente', J: 'Justificado' } as const
const ROPA = { falta: 'Falta', entregada: 'Entregada (sin pagar)', pagada: 'Entregada y pagada' } as const

export const hojaJugadores = (db: DB): Hoja => ({
  nombre: 'Jugadores',
  columnas: ['Apellido', 'Nombre', 'DNI', 'Nacimiento', 'Categoría base', 'Otros equipos', 'Ficha liga', 'Apto médico vence', 'Alta', 'Estado', 'Observaciones'],
  filas: db.jugadores.map((j) => {
    const base = equipoBase(db, j)
    return [
      j.apellido, j.nombre, j.dni, j.nacimiento, base ? nombreEquipo(db, base) : '',
      equiposDeJugador(db, j).filter((e) => e !== base).map((e) => nombreEquipo(db, e)).join(', '),
      j.fichaLiga, j.aptoVence, j.alta, j.activo ? 'Activo' : 'Baja', j.obs,
    ]
  }),
})

export function hojaAsistencia(db: DB, equipoId?: string): Hoja {
  const filas: Celda[][] = []
  for (const a of [...db.asistencias].sort((x, y) => x.fecha.localeCompare(y.fecha))) {
    if (equipoId && a.equipoId !== equipoId) continue
    for (const [jid, r] of Object.entries(a.registros)) {
      const j = db.jugadores.find((x) => x.id === jid)
      filas.push([a.fecha, nombreEquipo(db, a.equipoId), j ? nombreCompleto(j) : '(borrado)', ESTADO[r.estado], r.motivo ?? '', a.por])
    }
  }
  return { nombre: 'Asistencia', columnas: ['Fecha', 'Equipo', 'Jugador', 'Estado', 'Motivo', 'Tomada por'], filas }
}

export function hojaCuotas(db: DB): Hoja[] {
  const desde = `${db.config.temporada}-01`
  const meses = rangoMeses(desde, mesActual())
  const activos = db.jugadores.filter((j) => j.activo)
  const matriz: Hoja = {
    nombre: 'Cuotas por mes',
    columnas: ['Jugador', 'Categoría', 'Cuota', ...meses, 'Meses adeudados', 'Deuda'],
    filas: activos.map((j) => {
      const base = equipoBase(db, j)
      const pagos = db.pagos.filter((p) => p.jugadorId === j.id)
      const deuda = mesesAdeudados(db, j)
      return [
        nombreCompleto(j), base ? nombreEquipo(db, base) : '', cuotaDe(db, j),
        ...meses.map((m) => (m < j.alta ? '—' : pagos.some((p) => p.mes === m) ? 'Pagó' : 'Debe')),
        deuda.length, deuda.length * cuotaDe(db, j),
      ]
    }),
  }
  const pagos: Hoja = {
    nombre: 'Pagos registrados',
    columnas: ['Fecha', 'Mes', 'Jugador', 'Monto', 'Medio', 'Registrado por'],
    filas: db.pagos.map((p) => {
      const j = db.jugadores.find((x) => x.id === p.jugadorId)
      return [p.fecha, p.mes, j ? nombreCompleto(j) : '(borrado)', p.monto, p.medio, p.por]
    }),
  }
  return [matriz, pagos]
}

export function hojasRopa(db: DB): Hoja[] {
  return [
    { nombre: 'Catálogo de ropa', columnas: ['Prenda', 'Precio', 'Obligatoria'], filas: db.prendas.map((p) => [p.nombre, p.precio, p.obligatoria ? 'Sí' : 'No']) },
    {
      nombre: 'Ropa por jugador',
      columnas: ['Jugador', 'Categoría', ...db.prendas.map((p) => p.nombre)],
      filas: db.jugadores.filter((j) => j.activo).map((j) => {
        const base = equipoBase(db, j)
        return [nombreCompleto(j), base ? nombreEquipo(db, base) : '', ...db.prendas.map((p) => {
          const e = db.ropa[`${j.id}|${p.id}`]
          return e ? ROPA[e] : p.obligatoria ? 'Falta' : '—'
        })]
      }),
    },
  ]
}

export function hojasMateriales(db: DB): Hoja[] {
  return [
    {
      nombre: 'Inventario',
      columnas: ['Material', 'Total', 'Rotos', 'Prestados', 'Disponibles', 'Ubicación'],
      filas: db.materiales.map((m) => {
        const pr = prestado(db, m.id)
        return [m.nombre, m.total, m.rotos, pr, Math.max(0, m.total - m.rotos - pr), m.ubicacion]
      }),
    },
    {
      nombre: 'Préstamos',
      columnas: ['Fecha', 'Material', 'Cantidad', 'Equipo', 'Devuelto', 'Registrado por'],
      filas: db.prestamos.map((p) => [p.fecha, db.materiales.find((m) => m.id === p.materialId)?.nombre ?? '', p.cantidad, nombreEquipo(db, p.equipoId), p.devuelto ?? 'No', p.por]),
    },
  ]
}

export const hojaCalendario = (db: DB): Hoja => ({
  nombre: 'Calendario',
  columnas: ['Fecha', 'Desde', 'Hasta', 'Tipo', 'Actividad', 'Equipos', 'Rival', 'Condición', 'Lugar', 'Notas'],
  filas: [...db.eventos].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)).map((e) => [
    e.fecha, e.hora, e.horaFin, e.tipo, e.titulo, e.equipos.map((x) => nombreEquipo(db, x)).join(', '), e.rival, e.condicion, e.lugar, e.notas,
  ]),
})

export const hojaCanchas = (db: DB): Hoja => ({
  nombre: 'Canchas',
  columnas: ['Día', 'Desde', 'Hasta', 'Cancha', 'Sector', 'Equipo'],
  filas: [...db.asignaciones].sort((a, b) => a.dia - b.dia || a.desde.localeCompare(b.desde)).map((a) => {
    const c = db.canchas.find((x) => x.id === a.canchaId)
    return [DIAS[a.dia], a.desde, a.hasta, c?.nombre ?? '', a.zonas.map((z) => c?.zonas.find((x) => x.id === z)?.nombre ?? z).join(' + '), nombreEquipo(db, a.equipoId)]
  }),
})

export const hojaMatriculados = (db: DB): Hoja => ({
  nombre: 'Matriculados',
  columnas: ['División', 'Categoría', 'Jugadores (base)', 'Total en el equipo'],
  filas: equipos(db).map((e) => {
    const d = db.divisiones.find((x) => x.id === e.divisionId)!
    const activos = db.jugadores.filter((j) => j.activo)
    return [d.nombre, e.anio, activos.filter((j) => equipoBase(db, j) === e.id).length, activos.filter((j) => equiposDeJugador(db, j).includes(e.id)).length]
  }),
})

export const hojaRegistro = (db: DB): Hoja => ({
  nombre: 'Registro de cambios',
  columnas: ['Fecha y hora', 'Usuario', 'Acción'],
  filas: db.registro.map((r) => [new Date(r.t).toLocaleString('es-AR'), r.usuario, r.accion]),
})

export const exportar = {
  jugadores: (db: DB) => bajar('jugadores', [hojaJugadores(db)]),
  asistencia: (db: DB, equipoId?: string) => bajar(equipoId ? `asistencia-${nombreEquipo(db, equipoId).replace(/\s+/g, '-')}` : 'asistencia', [hojaAsistencia(db, equipoId)]),
  cuotas: (db: DB) => bajar('cuotas', hojaCuotas(db)),
  ropa: (db: DB) => bajar('ropa', hojasRopa(db)),
  materiales: (db: DB) => bajar('materiales', hojasMateriales(db)),
  calendario: (db: DB) => bajar('calendario', [hojaCalendario(db)]),
  canchas: (db: DB) => bajar('canchas', [hojaCanchas(db)]),
  matriculados: (db: DB) => bajar('matriculados', [hojaMatriculados(db)]),
  administracion: (db: DB) => bajar('administracion', [...hojaCuotas(db), ...hojasRopa(db), hojaMatriculados(db)]),
  todo: (db: DB) => bajar('club-completo', [
    hojaJugadores(db), hojaMatriculados(db), hojaAsistencia(db), ...hojaCuotas(db), ...hojasRopa(db),
    ...hojasMateriales(db), hojaCalendario(db), hojaCanchas(db), hojaRegistro(db),
  ]),
}
