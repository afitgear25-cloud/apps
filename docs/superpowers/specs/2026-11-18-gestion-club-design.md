# Gestión de Club de Fútbol — Diseño

Fecha: 2026-11-18 · Estado: aprobado para programar

## Para qué

Una app para que un club de fútbol afiliado a AFA gestione plantel, asistencia, cuotas, ropa,
materiales y uso de canchas, tocando botones en vez de escribir, con todo exportable a Excel.
Arranca para un club, pero está pensada para poder venderse a otros clubes.

## Objetivos

- Que el entrenador tome asistencia en segundos desde el celular, aunque no haya señal.
- Que coordinación vea todo el club de un vistazo (cantidades por categoría, asistencia, cuotas).
- Que administración controle cuotas, ropa y matriculados sin planillas sueltas.
- Que cualquier dato se pueda bajar a Excel como respaldo.

## No objetivos (por ahora)

- Acceso de padres o jugadores.
- Cobro online (Mercado Pago). Los pagos se registran a mano.
- Reemplazar la inscripción oficial en AFA o en la liga.

## Anti-objetivos

- Que cargar datos sea más lento que la planilla de papel.
- Que un entrenador vea datos de otras categorías o de cuotas.

## Usuarios y permisos

Cada persona tiene su propio usuario y contraseña. La pantalla de entrada muestra tres botones:
Coordinación, Administración, Entrenador.

| Rol | Ve y hace |
|---|---|
| Coordinación | Todo: tablero general, plantel, equipos, asistencia, canchas, materiales, cuotas, ropa, usuarios, configuración de temporada, exportaciones |
| Administración | Cuotas, ropa (catálogo con foto y precio, qué le falta a cada jugador), matriculados por categoría, exportaciones de su área |
| Entrenador | Solo sus equipos: asistencia, materiales (retirar y devolver), lugar en la cancha |

## Estructura deportiva

Temporada 2026 (editable cada año por coordinación):

| División | Categorías (año de nacimiento) |
|---|---|
| Preinfantiles | 2020, 2019, 2018, 2017 |
| Infantiles | 2016, 2015, 2014, 2013 |
| Juveniles | 2012, 2011, 2010, 2009, 2008, 2007, 2006 |
| Primera | mismas categorías que Juveniles, con los jugadores que ascienden |

- **Equipo** = temporada + división + año.
- Cada jugador tiene una **categoría base** que sale de su año de nacimiento (se asigna sola).
- Puede estar además en **otros equipos**: un 2007 que juega en 2006, o un juvenil que sube a Primera.
  Es el mismo jugador anotado en varios equipos, sin duplicar ficha.

## Módulos

1. **Plantel**: ficha del jugador (nombre, DNI, fecha de nacimiento, apto médico, número de ficha de la
   liga, foto, observaciones), categoría base y equipos adicionales. Sin datos de contacto ni WhatsApp.
2. **Asistencia**: por equipo y por día. Todos arrancan en Presente; se toca Ausente o Justificado
   (con motivo rápido: enfermedad, lesión, viaje, estudio, otro). Porcentaje por jugador y equipo.
3. **Cuotas**: valor mensual por división. Por mes, cada jugador figura Pagado o Pendiente; registrar
   pago es un toque (monto y medio). Lista de atrasados.
4. **Ropa**: catálogo de prendas con foto y precio. Por jugador: qué recibió, qué pagó, qué le falta.
5. **Materiales**: inventario con foto, cantidad total, rotos y disponibles. El entrenador retira
   cantidades para su equipo y las devuelve; se ve quién tiene qué.
6. **Canchas** (el predio real):
   - Cancha de 11: se divide a lo largo con redes en 3 canchas de fútbol 9 (A, B, C).
     Atajos: entera, dos de 9 juntas, una de 9.
   - Dos canchas de 7 (A y B): cada una se corta a lo ancho en 2 canchas de fútbol 5.
     Atajos: entera de 7, una de 5.
   - Asignaciones semanales (día, horario, cancha, sectores, equipo). La app avisa y no deja guardar
     si dos equipos chocan en el mismo sector y horario. El entrenador asigna solo a sus equipos.
7. **Calendario de actividades**: editable por coordinación. Cada actividad tiene fecha, horario, tipo
   (partido, entrenamiento especial, torneo, reunión, otro), equipos, rival y condición (local,
   visitante, neutral) si es partido, lugar y notas. Los fines de semana se resaltan (ahí van los
   partidos). El entrenador ve las actividades de sus equipos.
8. **Exportar a Excel**: plantel, asistencia, cuotas, ropa, materiales, calendario, canchas y registro
   de cambios, en un clic.
9. **Configuración**: escudo y nombre del club, temporada y divisiones, usuarios, valor de cuotas,
   respaldo (bajar y cargar), registro de cambios.

## Estilo visual

- Mayormente rojo y negro, con blanco de apoyo.
- Espacio fijo para el **escudo del club** en el encabezado y en la pantalla de ingreso.
  Hasta que llegue el escudo real se muestra uno provisorio; se reemplaza subiendo la imagen en
  Configuración o cambiando `public/escudo.svg`.
- Fotos en materiales, ropa y (opcional) jugadores. Las fotos se achican al subirlas.

## Cómo se construye (decisiones técnicas)

- **App web instalable** (PWA): React + TypeScript + Vite + Tailwind (sin servidor propio: se puede
  publicar en cualquier hosting estático). Se abre en el navegador y se
  agrega a la pantalla del celular. Funciona sin señal.
- **Primera versión: datos guardados en el dispositivo** (modo local), con datos de ejemplo, para
  poder usarla y probarla ya. Las contraseñas se guardan con hash, pero en este modo no hay seguridad
  real: cualquiera con acceso al dispositivo podría leer los datos.
- **Segunda etapa: nube compartida** (Supabase: base Postgres, usuarios y permisos por fila), para que
  todos los usuarios vean los mismos datos. Requiere crear la cuenta del club; la capa de datos está
  aislada en un solo módulo para hacer ese cambio sin rehacer pantallas.
- Excel con la librería ExcelJS.

## Enfoques considerados

| Enfoque | Por qué sí / no |
|---|---|
| **App web instalable (elegido)** | Roles, Excel, uso sin señal, se puede vender; costo bajo |
| Sin código (Airtable/AppSheet) | Rápido, pero permisos limitados, costo por usuario, difícil de vender |
| App nativa (Flutter) | Mejor en celu, pero más lenta y cara, publicación en tiendas |

## Datos de menores

Se guardan datos de menores: en Argentina aplica la Ley 25.326. Antes de usar la versión en la nube
con datos reales hace falta el consentimiento de los padres y limitar el acceso por rol (ya previsto).

## Queda a criterio de quien construye

- Diseño exacto de cada pantalla, dentro del estilo rojo/negro/blanco.
- Motivos rápidos de ausencia y atajos de zonas de cancha (editables más adelante).
- Datos de ejemplo.

## Próximas etapas

1. Conectar la nube (Supabase) y crear usuarios reales.
2. Resultados de partidos: convocatoria, goles y tarjetas.
3. Excepciones de cancha por fecha (lluvia, torneos).
4. Multi-club para vender (cada club con sus datos separados).
