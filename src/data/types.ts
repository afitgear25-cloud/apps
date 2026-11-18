export type Rol = 'coordinacion' | 'administracion' | 'entrenador'

export interface Usuario {
  id: string
  nombre: string
  usuario: string
  rol: Rol
  passHash: string
  equipos: string[] // ids de equipos (solo entrenadores)
  activo: boolean
}

export interface Division {
  id: string
  nombre: string
  orden: number
  anios: number[]
  esPrimera: boolean // Primera se arma con jugadores de otras divisiones
  cuota: number // valor mensual
}

/** Un equipo = división + año. Se deriva de las divisiones; id = `${divisionId}-${anio}`. */
export interface Equipo {
  id: string
  divisionId: string
  anio: number
}

export interface Jugador {
  id: string
  nombre: string
  apellido: string
  dni: string
  nacimiento: string // YYYY-MM-DD
  alta: string // YYYY-MM, desde cuándo paga cuota
  fichaLiga: string
  aptoVence: string // YYYY-MM-DD o ''
  foto?: string
  obs: string
  activo: boolean
  equipoBase?: string // si se cambia a mano; si no, sale del año de nacimiento
  equiposExtra: string[]
}

export type EstadoAsistencia = 'P' | 'A' | 'J'

export interface Asistencia {
  id: string // `${equipoId}|${fecha}`
  equipoId: string
  fecha: string // YYYY-MM-DD
  registros: Record<string, { estado: EstadoAsistencia; motivo?: string }>
  por: string
}

export type MedioPago = 'efectivo' | 'transferencia'

export interface Pago {
  id: string
  jugadorId: string
  mes: string // YYYY-MM
  monto: number
  medio: MedioPago
  fecha: string
  por: string
}

export interface Prenda {
  id: string
  nombre: string
  precio: number
  foto?: string
  obligatoria: boolean
}

export type EstadoRopa = 'falta' | 'entregada' | 'pagada'

export interface Material {
  id: string
  nombre: string
  foto?: string
  total: number
  rotos: number
  ubicacion: string
}

export interface Prestamo {
  id: string
  materialId: string
  equipoId: string
  cantidad: number
  fecha: string
  devuelto?: string
  por: string
}

export interface Zona {
  id: string
  nombre: string
}

export interface Cancha {
  id: string
  nombre: string
  forma: 'f11' | 'f7'
  zonas: Zona[]
  atajos: { nombre: string; zonas: string[] }[]
}

export interface Asignacion {
  id: string
  canchaId: string
  dia: number // 0 = domingo ... 6 = sábado
  desde: string // HH:MM
  hasta: string
  zonas: string[]
  equipoId: string
}

export type TipoEvento = 'partido' | 'entrenamiento' | 'torneo' | 'reunion' | 'otro'

export interface Evento {
  id: string
  fecha: string
  hora: string
  horaFin: string
  tipo: TipoEvento
  titulo: string
  equipos: string[]
  rival: string
  condicion: 'local' | 'visitante' | 'neutral'
  lugar: string
  notas: string
}

export interface Registro {
  t: string
  usuario: string
  accion: string
}

export interface Config {
  clubNombre: string
  escudo?: string
  temporada: number
}

export interface DB {
  version: 1
  config: Config
  usuarios: Usuario[]
  divisiones: Division[]
  jugadores: Jugador[]
  asistencias: Asistencia[]
  pagos: Pago[]
  prendas: Prenda[]
  ropa: Record<string, EstadoRopa> // `${jugadorId}|${prendaId}`
  materiales: Material[]
  prestamos: Prestamo[]
  canchas: Cancha[]
  asignaciones: Asignacion[]
  eventos: Evento[]
  registro: Registro[]
}
