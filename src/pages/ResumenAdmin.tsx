import { Link } from 'react-router-dom'
import { useDB } from '../data/store'
import { cuotaDe, mesesAdeudados } from '../data/logic'
import { mesActual, nombreMes, pesos } from '../lib/util'
import { Dato, Tarjeta, Titulo } from '../components/ui'

export function ResumenAdmin() {
  const db = useDB()
  const mes = mesActual()
  const activos = db.jugadores.filter((j) => j.activo)
  const delMes = db.pagos.filter((p) => p.mes === mes)
  const pagaron = new Set(delMes.map((p) => p.jugadorId))
  const corresponde = activos.filter((j) => j.alta <= mes)
  const deudaTotal = activos.reduce((s, j) => s + mesesAdeudados(db, j).filter((m) => m < mes).length * cuotaDe(db, j), 0)
  const obligatorias = db.prendas.filter((p) => p.obligatoria)
  const faltaRopa = activos.filter((j) => obligatorias.some((p) => (db.ropa[`${j.id}|${p.id}`] ?? 'falta') === 'falta')).length
  const sinPagarRopa = activos.filter((j) => obligatorias.some((p) => db.ropa[`${j.id}|${p.id}`] === 'entregada')).length

  return (
    <>
      <Titulo sub={nombreMes(mes)}>Administración</Titulo>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Dato rojo valor={pesos(delMes.reduce((s, p) => s + p.monto, 0))} texto="Cobrado este mes" />
        <Dato valor={`${corresponde.filter((j) => pagaron.has(j.id)).length} / ${corresponde.length}`} texto="Pagaron la cuota del mes" />
        <Dato valor={pesos(deudaTotal)} texto="Deuda de meses anteriores" />
        <Dato valor={activos.length} texto="Matriculados activos" />
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <Link to="/cuotas"><Tarjeta className="hover:border-rojo h-full"><div className="font-bold text-lg">Cuotas →</div><p className="text-sm text-tenue">Cobrar, ver pendientes y atrasados.</p></Tarjeta></Link>
        <Link to="/ropa"><Tarjeta className="hover:border-rojo h-full"><div className="font-bold text-lg">Ropa →</div><p className="text-sm text-tenue">{faltaRopa} jugadores con ropa faltante · {sinPagarRopa} con ropa sin pagar.</p></Tarjeta></Link>
        <Link to="/matriculados"><Tarjeta className="hover:border-rojo h-full"><div className="font-bold text-lg">Matriculados →</div><p className="text-sm text-tenue">Cantidad por división y categoría.</p></Tarjeta></Link>
      </div>
    </>
  )
}
