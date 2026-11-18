import type { Asignacion, DB, Equipo, Jugador, Usuario } from './types'
import { mesActual, rangoMeses } from '../lib/util'

export function equipos(db: DB): Equipo[] {
  return [...db.divisiones]
    .sort((a, b) => a.orden - b.orden)
    .flatMap((d) => d.anios.map((anio) => ({ id: `${d.id}-${anio}`, divisionId: d.id, anio })))
}

export function equipoPorId(db: DB, id: string) {
  return equipos(db).find((e) => e.id === id)
}

export function nombreEquipo(db: DB, id: string) {
  const e = equipoPorId(db, id)
  if (!e) return '(equipo eliminado)'
  const d = db.divisiones.find((x) => x.id === e.divisionId)
  return `${d?.nombre ?? ''} ${e.anio}`
}

export function equipoBase(db: DB, j: Jugador): string | undefined {
  if (j.equipoBase) return j.equipoBase
  const anio = Number(j.nacimiento.slice(0, 4))
  const div = db.divisiones.find((d) => !d.esPrimera && d.anios.includes(anio))
  return div ? `${div.id}-${anio}` : undefined
}

export function equiposDeJugador(db: DB, j: Jugador): string[] {
  const base = equipoBase(db, j)
  return [...new Set([...(base ? [base] : []), ...j.equiposExtra])]
}

export function jugadoresDeEquipo(db: DB, equipoId: string): Jugador[] {
  return db.jugadores
    .filter((j) => j.activo && equiposDeJugador(db, j).includes(equipoId))
    .sort((a, b) => a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre))
}

export const nombreCompleto = (j: Jugador) => `${j.apellido}, ${j.nombre}`

export function entrenadoresDe(db: DB, equipoId: string): Usuario[] {
  return db.usuarios.filter((u) => u.activo && u.rol === 'entrenador' && u.equipos.includes(equipoId))
}

export function cuotaDe(db: DB, j: Jugador) {
  const base = equipoBase(db, j)
  const div = db.divisiones.find((d) => base?.startsWith(d.id + '-'))
  return div?.cuota ?? 0
}

export function mesesAdeudados(db: DB, j: Jugador): string[] {
  const pagos = new Set(db.pagos.filter((p) => p.jugadorId === j.id).map((p) => p.mes))
  return rangoMeses(j.alta, mesActual()).filter((m) => !pagos.has(m))
}

export function prestado(db: DB, materialId: string) {
  return db.prestamos.filter((p) => p.materialId === materialId && !p.devuelto).reduce((s, p) => s + p.cantidad, 0)
}
export function disponible(db: DB, materialId: string) {
  const m = db.materiales.find((x) => x.id === materialId)
  return m ? Math.max(0, m.total - m.rotos - prestado(db, materialId)) : 0
}

export function chocan(a: Asignacion, b: Asignacion) {
  return (
    a.id !== b.id &&
    a.canchaId === b.canchaId &&
    a.dia === b.dia &&
    a.desde < b.hasta &&
    b.desde < a.hasta &&
    a.zonas.some((z) => b.zonas.includes(z))
  )
}

export function aptoVencido(j: Jugador, fecha: string) {
  return !j.aptoVence || j.aptoVence < fecha
}

/** Porcentaje de asistencia (presentes / registros) de un jugador en un equipo. */
export function porcentajeAsistencia(db: DB, equipoId: string, jugadorId?: string) {
  let total = 0
  let presentes = 0
  for (const a of db.asistencias) {
    if (a.equipoId !== equipoId) continue
    for (const [jid, r] of Object.entries(a.registros)) {
      if (jugadorId && jid !== jugadorId) continue
      total++
      if (r.estado === 'P') presentes++
    }
  }
  return total ? Math.round((presentes / total) * 100) : null
}
