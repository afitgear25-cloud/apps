import type { Cancha, DB, Division, Jugador, Usuario } from './types'
import { hashPass, isoFecha, mesActual, rangoMeses, uid } from '../lib/util'

const NOMBRES = ['Lautaro', 'Tomás', 'Santino', 'Benjamín', 'Thiago', 'Mateo', 'Bautista', 'Joaquín', 'Valentín', 'Felipe', 'Lucas', 'Juan Cruz', 'Ignacio', 'Facundo', 'Agustín', 'Gonzalo', 'Franco', 'Nicolás', 'Máximo', 'Bruno']
const APELLIDOS = ['González', 'Rodríguez', 'Gómez', 'Fernández', 'López', 'Díaz', 'Martínez', 'Pérez', 'Romero', 'Sosa', 'Álvarez', 'Torres', 'Ruiz', 'Ramírez', 'Flores', 'Benítez', 'Acosta', 'Medina', 'Herrera', 'Aguirre', 'Pereyra', 'Gutiérrez', 'Molina', 'Castro']

/** Generador pseudoaleatorio fijo para que los datos de ejemplo sean siempre iguales. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
}

export const DIVISIONES_INICIALES: Division[] = [
  { id: 'preinf', nombre: 'Preinfantiles', orden: 1, anios: [2020, 2019, 2018, 2017], esPrimera: false, cuota: 15000 },
  { id: 'inf', nombre: 'Infantiles', orden: 2, anios: [2016, 2015, 2014, 2013], esPrimera: false, cuota: 18000 },
  { id: 'juv', nombre: 'Juveniles', orden: 3, anios: [2012, 2011, 2010, 2009, 2008, 2007, 2006], esPrimera: false, cuota: 20000 },
  { id: 'pri', nombre: 'Primera', orden: 4, anios: [2012, 2011, 2010, 2009, 2008, 2007, 2006], esPrimera: true, cuota: 20000 },
]

export const CANCHAS_INICIALES: Cancha[] = [
  {
    id: 'c11',
    nombre: 'Cancha de 11',
    forma: 'f11',
    zonas: [
      { id: 'f9a', nombre: 'Fútbol 9 · A' },
      { id: 'f9b', nombre: 'Fútbol 9 · B' },
      { id: 'f9c', nombre: 'Fútbol 9 · C' },
    ],
    atajos: [
      { nombre: 'Cancha entera (11)', zonas: ['f9a', 'f9b', 'f9c'] },
      { nombre: 'Dos de 9 (A+B)', zonas: ['f9a', 'f9b'] },
      { nombre: 'Dos de 9 (B+C)', zonas: ['f9b', 'f9c'] },
      { nombre: 'Fútbol 9 · A', zonas: ['f9a'] },
      { nombre: 'Fútbol 9 · B', zonas: ['f9b'] },
      { nombre: 'Fútbol 9 · C', zonas: ['f9c'] },
    ],
  },
  ...['A', 'B'].map<Cancha>((l) => ({
    id: `c7${l.toLowerCase()}`,
    nombre: `Cancha de 7 · ${l}`,
    forma: 'f7',
    zonas: [
      { id: `f5${l.toLowerCase()}1`, nombre: `Fútbol 5 · ${l}1` },
      { id: `f5${l.toLowerCase()}2`, nombre: `Fútbol 5 · ${l}2` },
    ],
    atajos: [
      { nombre: 'Cancha de 7 entera', zonas: [`f5${l.toLowerCase()}1`, `f5${l.toLowerCase()}2`] },
      { nombre: `Fútbol 5 · ${l}1`, zonas: [`f5${l.toLowerCase()}1`] },
      { nombre: `Fútbol 5 · ${l}2`, zonas: [`f5${l.toLowerCase()}2`] },
    ],
  })),
]

export function crearSeed(): DB {
  const r = rng(2026)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  const temporada = new Date().getFullYear()
  const mes = mesActual()
  const altaTemporada = `${temporada}-03`

  const jugadores: Jugador[] = []
  for (const d of DIVISIONES_INICIALES.filter((x) => !x.esPrimera)) {
    for (const anio of d.anios) {
      const cant = 8 + Math.floor(r() * 7)
      for (let i = 0; i < cant; i++) {
        const mesN = 1 + Math.floor(r() * 12)
        const diaN = 1 + Math.floor(r() * 28)
        const apto = new Date(temporada, 2 + Math.floor(r() * 14), 1)
        jugadores.push({
          id: uid(),
          nombre: pick(NOMBRES),
          apellido: pick(APELLIDOS),
          dni: String(40000000 + Math.floor(r() * 25000000) - (anio - 2006) * 900000),
          nacimiento: `${anio}-${String(mesN).padStart(2, '0')}-${String(diaN).padStart(2, '0')}`,
          alta: r() < 0.85 ? altaTemporada : `${temporada}-0${5 + Math.floor(r() * 4)}`,
          fichaLiga: r() < 0.8 ? String(100000 + Math.floor(r() * 899999)) : '',
          aptoVence: isoFecha(apto),
          obs: '',
          activo: true,
          equiposExtra: [],
        })
      }
    }
  }
  // Algunos juveniles también juegan en Primera o en la categoría de arriba.
  const juveniles = jugadores.filter((j) => Number(j.nacimiento.slice(0, 4)) <= 2008)
  juveniles.slice(0, 14).forEach((j) => j.equiposExtra.push(`pri-${j.nacimiento.slice(0, 4)}`))
  const j2007 = jugadores.find((j) => j.nacimiento.startsWith('2007'))
  if (j2007) j2007.equiposExtra.push('juv-2006')

  const usuarios: Usuario[] = [
    { id: 'u-coord', nombre: 'Coordinación General', usuario: 'coordinador', rol: 'coordinacion', passHash: hashPass('1234'), equipos: [], activo: true },
    { id: 'u-admin', nombre: 'Administración', usuario: 'admin', rol: 'administracion', passHash: hashPass('1234'), equipos: [], activo: true },
    { id: 'u-e1', nombre: 'Prof. Martín', usuario: 'martin', rol: 'entrenador', passHash: hashPass('1234'), equipos: ['juv-2010', 'juv-2009'], activo: true },
    { id: 'u-e2', nombre: 'Prof. Laura', usuario: 'laura', rol: 'entrenador', passHash: hashPass('1234'), equipos: ['inf-2016', 'inf-2015'], activo: true },
    { id: 'u-e3', nombre: 'Prof. Diego', usuario: 'diego', rol: 'entrenador', passHash: hashPass('1234'), equipos: ['preinf-2019', 'preinf-2018'], activo: true },
  ]

  // Pagos: la mayoría al día hasta el mes pasado, algunos atrasados.
  const pagos = jugadores.flatMap((j) => {
    const meses = rangoMeses(j.alta, mes)
    const debe = r() < 0.2 ? 1 + Math.floor(r() * 3) : r() < 0.5 ? 1 : 0
    return meses.slice(0, Math.max(0, meses.length - debe)).map((m) => ({
      id: uid(),
      jugadorId: j.id,
      mes: m,
      monto: 0,
      medio: (r() < 0.6 ? 'transferencia' : 'efectivo') as 'transferencia' | 'efectivo',
      fecha: `${m}-10`,
      por: 'Administración',
    }))
  })
  for (const p of pagos) {
    const j = jugadores.find((x) => x.id === p.jugadorId)!
    const anio = Number(j.nacimiento.slice(0, 4))
    p.monto = DIVISIONES_INICIALES.find((d) => !d.esPrimera && d.anios.includes(anio))!.cuota
  }

  const prendas = [
    { id: 'p-cam', nombre: 'Camiseta oficial', precio: 28000, obligatoria: true },
    { id: 'p-sho', nombre: 'Short', precio: 14000, obligatoria: true },
    { id: 'p-med', nombre: 'Medias', precio: 7000, obligatoria: true },
    { id: 'p-buz', nombre: 'Buzo de entrenamiento', precio: 35000, obligatoria: false },
    { id: 'p-bol', nombre: 'Bolso', precio: 22000, obligatoria: false },
  ]
  const ropa: DB['ropa'] = {}
  for (const j of jugadores) {
    for (const p of prendas.filter((x) => x.obligatoria)) {
      const x = r()
      ropa[`${j.id}|${p.id}`] = x < 0.65 ? 'pagada' : x < 0.85 ? 'entregada' : 'falta'
    }
  }

  // Próximo sábado y domingo para el calendario.
  const hoyD = new Date()
  const sab = new Date(hoyD)
  sab.setDate(hoyD.getDate() + ((6 - hoyD.getDay() + 7) % 7 || 7))
  const dom = new Date(sab)
  dom.setDate(sab.getDate() + 1)

  return {
    version: 1,
    config: { clubNombre: 'Club Atlético', temporada },
    usuarios,
    divisiones: structuredClone(DIVISIONES_INICIALES),
    jugadores,
    asistencias: [],
    pagos,
    prendas,
    ropa,
    materiales: [
      { id: 'm-pel', nombre: 'Pelotas N°5', total: 30, rotos: 2, ubicacion: 'Depósito' },
      { id: 'm-pel4', nombre: 'Pelotas N°4', total: 20, rotos: 1, ubicacion: 'Depósito' },
      { id: 'm-bol', nombre: 'Bolsos de pelotas', total: 10, rotos: 0, ubicacion: 'Depósito' },
      { id: 'm-con', nombre: 'Conos', total: 60, rotos: 4, ubicacion: 'Depósito' },
      { id: 'm-pec', nombre: 'Pecheras', total: 40, rotos: 0, ubicacion: 'Vestuario' },
      { id: 'm-val', nombre: 'Vallas', total: 12, rotos: 1, ubicacion: 'Depósito' },
      { id: 'm-esc', nombre: 'Escaleras de coordinación', total: 4, rotos: 0, ubicacion: 'Depósito' },
      { id: 'm-arc', nombre: 'Arcos chicos', total: 6, rotos: 0, ubicacion: 'Cancha' },
    ],
    prestamos: [],
    canchas: structuredClone(CANCHAS_INICIALES),
    asignaciones: [
      { id: uid(), canchaId: 'c11', dia: 1, desde: '18:00', hasta: '19:30', zonas: ['f9a'], equipoId: 'juv-2012' },
      { id: uid(), canchaId: 'c11', dia: 1, desde: '18:00', hasta: '19:30', zonas: ['f9b', 'f9c'], equipoId: 'juv-2010' },
      { id: uid(), canchaId: 'c11', dia: 1, desde: '19:30', hasta: '21:00', zonas: ['f9a', 'f9b', 'f9c'], equipoId: 'pri-2006' },
      { id: uid(), canchaId: 'c7a', dia: 1, desde: '17:30', hasta: '18:30', zonas: ['f5a1'], equipoId: 'preinf-2019' },
      { id: uid(), canchaId: 'c7a', dia: 1, desde: '17:30', hasta: '18:30', zonas: ['f5a2'], equipoId: 'preinf-2018' },
      { id: uid(), canchaId: 'c7b', dia: 1, desde: '18:00', hasta: '19:15', zonas: ['f5b1', 'f5b2'], equipoId: 'inf-2016' },
      { id: uid(), canchaId: 'c11', dia: 3, desde: '18:00', hasta: '19:30', zonas: ['f9a', 'f9b'], equipoId: 'juv-2009' },
      { id: uid(), canchaId: 'c11', dia: 3, desde: '18:00', hasta: '19:30', zonas: ['f9c'], equipoId: 'inf-2013' },
      { id: uid(), canchaId: 'c7b', dia: 3, desde: '18:00', hasta: '19:15', zonas: ['f5b1', 'f5b2'], equipoId: 'inf-2015' },
    ],
    eventos: [
      { id: uid(), fecha: isoFecha(sab), hora: '09:00', horaFin: '10:30', tipo: 'partido', titulo: '', equipos: ['juv-2010'], rival: 'Deportivo Norte', condicion: 'local', lugar: 'Cancha de 11', notas: 'Presentarse 8:15' },
      { id: uid(), fecha: isoFecha(sab), hora: '10:45', horaFin: '12:15', tipo: 'partido', titulo: '', equipos: ['juv-2009'], rival: 'Deportivo Norte', condicion: 'local', lugar: 'Cancha de 11', notas: '' },
      { id: uid(), fecha: isoFecha(dom), hora: '15:30', horaFin: '17:15', tipo: 'partido', titulo: '', equipos: ['pri-2006'], rival: 'Sportivo Sur', condicion: 'visitante', lugar: 'Cancha de Sportivo Sur', notas: 'Micro sale 13:30' },
      { id: uid(), fecha: isoFecha(sab), hora: '09:30', horaFin: '12:00', tipo: 'torneo', titulo: 'Encuentro de baby fútbol', equipos: ['preinf-2019', 'preinf-2018'], rival: '', condicion: 'local', lugar: 'Canchas de 7', notas: '' },
    ],
    registro: [],
  }
}
