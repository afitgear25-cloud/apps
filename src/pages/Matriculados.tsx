import { useDB } from '../data/store'
import { equipoBase, equipos, equiposDeJugador } from '../data/logic'
import { exportar } from '../lib/excel'
import { Boton, Dato, Tarjeta, Titulo } from '../components/ui'

export function Matriculados() {
  const db = useDB()
  const activos = db.jugadores.filter((j) => j.activo)
  const eqs = equipos(db)
  return (
    <>
      <Titulo sub="“Propios” = nacidos ese año. “En el equipo” suma a los que juegan ahí desde otra categoría."
        extra={<Boton v="oscuro" onClick={() => exportar.matriculados(db)}>Bajar Excel</Boton>}>Matriculados</Titulo>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Dato rojo valor={activos.length} texto="Activos en el club" />
        <Dato valor={db.jugadores.length - activos.length} texto="Dados de baja" />
        {[...db.divisiones].filter((d) => !d.esPrimera).sort((a, b) => a.orden - b.orden).slice(0, 2).map((d) => (
          <Dato key={d.id} valor={activos.filter((j) => equipoBase(db, j)?.startsWith(d.id + '-')).length} texto={d.nombre} />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[...db.divisiones].sort((a, b) => a.orden - b.orden).map((d) => {
          const filas = eqs.filter((e) => e.divisionId === d.id).map((e) => ({
            anio: e.anio,
            propios: activos.filter((j) => equipoBase(db, j) === e.id).length,
            total: activos.filter((j) => equiposDeJugador(db, j).includes(e.id)).length,
          }))
          return (
            <Tarjeta key={d.id}>
              <div className="flex justify-between items-baseline mb-2">
                <h2 className="font-black uppercase">{d.nombre}</h2>
                <span className="text-rojo-claro font-bold">{d.esPrimera ? filas.reduce((s, f) => s + f.total, 0) : filas.reduce((s, f) => s + f.propios, 0)} jugadores</span>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-tenue text-left"><th className="py-1 font-normal">Categoría</th>{!d.esPrimera && <th className="font-normal text-right">Propios</th>}<th className="font-normal text-right">En el equipo</th></tr></thead>
                <tbody className="divide-y divide-borde">
                  {filas.map((f) => (
                    <tr key={f.anio}><td className="py-1.5 font-semibold">{f.anio}</td>{!d.esPrimera && <td className="text-right">{f.propios}</td>}<td className="text-right">{f.total}</td></tr>
                  ))}
                </tbody>
              </table>
            </Tarjeta>
          )
        })}
      </div>
    </>
  )
}
