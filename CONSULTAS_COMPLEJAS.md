# Consultas complejas de BIBLIO

## Alcance y compatibilidad

Las 20 consultas avanzadas definitivas están agrupadas en [queries/esau.graphql](./queries/esau.graphql) y [queries/miguel.graphql](./queries/miguel.graphql). Se pueden seleccionar por nombre y ejecutar desde Apollo Sandbox. El esquema y las agregaciones están en [src/advanced-analytics.js](./src/advanced-analytics.js); sus resolvers se combinan con los existentes en [src/schema.js](./src/schema.js).

Los 20 campos analíticos anteriores siguen disponibles como API de compatibilidad. Las consultas de este documento son la versión avanzada y no reemplazan ni alteran los CRUD de libros y usuarios.

## Modelos y datos usados

- **books:** título, autor, ISBN, año y género.
- **users:** nombre, correo y teléfono.
- **copies:** referencia `book`, código de inventario y estado (`available`, `loaned`, `maintenance`).
- **loans:** referencias `user` y `copy`, fechas de préstamo/vencimiento/devolución y estado (`active`, `returned`, `overdue`).

La conexión de consultas y verificaciones apunta explícitamente a `biblio`. Los joins usan los ObjectId de las referencias reales; las agregaciones basadas en libros o ejemplares mantienen cada documento en una fila y resumen los arreglos de relaciones antes de agrupar, para que varios préstamos históricos no multipliquen el inventario.

## Clasificación de las consultas anteriores

| Grupo anterior | Complejidad antes del cambio |
|---|---|
| Libros por género, autor o década; estados de ejemplares; estadísticas del catálogo; préstamos por estado o mes; devoluciones por mes; estadísticas de retraso y puntualidad | Principalmente `$group`/`$project`: análisis simples, sin relaciones |
| Ejemplares disponibles, libros sin ejemplares, inventario por libro, préstamos activos por usuario y usuarios sin préstamos | `$lookup` o agrupación local: nivel intermedio, con pocos cálculos |
| Inventario por género, libros más prestados, usuarios más activos, retrasos detallados y préstamos por género | Varios joins o cálculos de fechas: 5 consultas con el mayor nivel previo |

Las consultas nuevas amplían esas preguntas con indicadores, ventanas temporales, perfiles de circulación y comparaciones. Las consultas de auditoría exacta (por ejemplo, detectar libros sin inventario) siguen siendo útiles aunque el resultado actual sea vacío.

## Resultados de datos y limitaciones

La verificación de solo lectura contra Atlas encontró **1,000 libros, 1,000 usuarios, 1,000 ejemplares y 1,000 préstamos**; las relaciones revisadas no mostraron ejemplares sin libro ni préstamos sin usuario o ejemplar. Los análisis reales también mostraron:

- 10 géneros y 77 años de publicación distintos (1950–2026), pero exactamente 100 libros por género.
- 1,000 autores distintos y cada autor tiene un libro.
- Cada libro tiene exactamente un ejemplar; hay 300 disponibles y 700 prestados, sin ejemplares en mantenimiento.
- Cada usuario tiene exactamente un préstamo. Los estados son 500 activos, 300 devueltos y 200 vencidos.
- Los préstamos cubren aproximadamente junio–noviembre de 2026; noviembre concentra 475 de los 1,000.

Por lo tanto, los análisis por género, estado, fechas y puntualidad sí producen comparaciones; los rankings por autor, libro o usuario son estructuralmente avanzados, pero no pueden distinguir recurrencia cuando cada entidad solo aparece una vez. La comparación temporal también debe leerse con cautela por la concentración de préstamos al final del período.

Se generó antes de los cambios un respaldo BSON Extended JSON, excluido de Git: [manifest.json](./backups/biblio-pre-analytics-20261122T070041202Z/manifest.json). Incluye copias de las cuatro colecciones y conserva fechas/ObjectId; debe guardarse con cuidado porque contiene los documentos completos.

### Propuesta futura para ampliar la variedad

No se modificaron los 4,000 documentos. Antes de autorizar una futura ampliación, se recomienda:

1. Añadir varios ejemplares a una parte de los títulos y variar sus estados, sin cambiar referencias existentes.
2. Crear historial de varios préstamos por usuario y por ejemplar, distribuidos durante 18–24 meses, con préstamos devueltos a tiempo y tarde, activos y vencidos.
3. Reutilizar autores y usuarios en múltiples títulos/préstamos, y añadir algunos usuarios sin actividad para poder medir recurrencia y abandono.
4. Distribuir el volumen entre meses y géneros de manera no uniforme, conservando códigos/ISBN/correos únicos y evitando préstamos activos superpuestos para un mismo ejemplar.
5. Antes de aplicar esa ampliación: generar un nuevo respaldo, revisar un reporte de “dry run” con conteos y referencias, y obtener autorización explícita. El generador actual `npm run seed` no sirve para anexar: se detiene si encuentra documentos.

## 10 consultas avanzadas de Esaú

### 1. Disponibilidad y demanda por género — `esauAvailabilityByGenre`

- **Objetivo / problema:** comparar el tamaño del catálogo y la disponibilidad real con la circulación por género, para decidir dónde hacen falta ejemplares.
- **Colecciones:** `books`, `copies`, `loans`.
- **Operadores:** `$lookup`, `$addFields`, `$filter`, `$size`, `$group`, `$cond`, `$divide`, `$round`, `$sort`.
- **Cálculos:** disponibilidad y utilización porcentual; préstamos totales y de los últimos 30 días frente a los 30 anteriores; cambio porcentual y préstamos por ejemplar.
- **Por qué es avanzada:** enlaza circulación histórica con inventario sin desdoblar las filas del libro por cada préstamo.
- **GraphQL ejecutable:**

```graphql
query EsausDisponibilidadYDemandaPorGenero {
  esauAvailabilityByGenre {
    genre totalBooks totalCopies availableCopies loanedCopies maintenanceCopies
    availabilityPct utilizationPct totalLoans loansLast30Days loansPrevious30Days
    demandChangePct loansPerCopy
  }
}
```

- **Resultado real:** devolvió 10 géneros. En Biografía: 100 libros, 100 ejemplares, 30 disponibles (30%), 70 prestados (70%), 100 préstamos y 50 frente a 14 en las ventanas comparadas: +257.1%. El indicador es útil por género, no por variación entre títulos, pues el catálogo está balanceado.

### 2. Circulación por autor — `esauAuthorCirculation`

- **Objetivo / problema:** detectar autores cuyo catálogo genera circulación o devoluciones tardías.
- **Colecciones:** `books`, `copies`, `loans`.
- **Operadores:** `$lookup`, `$addFields`, `$filter`, `$setUnion`, `$reduce`, `$group`, `$project`, `$sort`, `$limit`.
- **Cálculos:** libros, ejemplares y préstamos por autor; prestatarios distintos sin contar repetidamente a quien tomó varios títulos del mismo autor; tasa de devolución tardía y préstamos por libro.
- **Por qué es avanzada:** combina tres colecciones y deduplica prestatarios a través de varios libros antes de agregar.
- **GraphQL ejecutable:**

```graphql
query EsausCirculacionPorAutor {
  esauAuthorCirculation(limit: 20) {
    author bookCount totalCopies availableCopies totalLoans distinctBorrowers
    lateReturns lateReturnPct loansPerBook
  }
}
```

- **Resultado real:** cada autor tiene un libro, un ejemplar y un préstamo; por ello el ranking no discrimina demanda. Algunas filas principales muestran una devolución tardía de una devolución (100%), pero no es una tasa estable con denominador 1.

### 3. Circulación por década de publicación — `esauDecadeCirculation`

- **Objetivo / problema:** comparar si los libros de distintas épocas se usan y están disponibles de manera diferente.
- **Colecciones:** `books`, `copies`, `loans`.
- **Operadores:** `$match`, `$lookup`, `$addFields`, `$group`, `$subtract`, `$mod`, `$cond`, `$sort`.
- **Cálculos:** década, cantidad de títulos, ejemplares, préstamos, préstamos vencidos, disponibilidad y promedio de préstamos por título.
- **Por qué es avanzada:** la cohorte bibliográfica se cruza con inventario y circulación, en vez de contar solo publicaciones.
- **GraphQL ejecutable:**

```graphql
query EsausCirculacionPorDecada {
  esauDecadeCirculation {
    decade bookCount totalCopies totalLoans overdueLoans availabilityPct loansPerBook
  }
}
```

- **Resultado real:** devolvió 8 décadas. La década de 1950 tuvo 130 títulos, 130 ejemplares y 130 préstamos, con 25 vencidos y 29.2% de disponibilidad. El promedio de 1 préstamo por título confirma la uniformidad de copias/historial.

### 4. Cambio de demanda por género — `esauGenrePeriodAnalysis`

- **Objetivo / problema:** encontrar géneros cuya demanda subió o bajó entre dos períodos consecutivos de 30 días y contrastarla con su inventario disponible.
- **Colecciones:** `books`, `copies`, `loans`.
- **Operadores:** `$lookup`, `$filter`, `$group`, `$addFields`, `$cond`, `$divide`, `$round`, `$sort`.
- **Cálculos:** préstamos por género en cada ventana, variación porcentual, disponibilidad porcentual y préstamos actuales por ejemplar disponible.
- **Por qué es avanzada:** compara ventanas de fechas calculadas en tiempo de consulta y contextualiza el cambio con el inventario.
- **GraphQL ejecutable:**

```graphql
query EsausComparacionDeDemandaPorGenero {
  esauGenrePeriodAnalysis {
    genre totalCopies availableCopies availabilityPct currentPeriodLoans
    previousPeriodLoans demandChangePct loansPerAvailableCopy
  }
}
```

- **Resultado real:** devolvió 10 géneros. Ciencia ficción registró 53 préstamos en la ventana actual frente a 13 en la anterior (+307.7%); los 30 ejemplares disponibles de 100 dan 1.77 préstamos actuales por ejemplar disponible. El porcentaje responde al momento de ejecución.

### 5. Historial de los ejemplares disponibles — `esauAvailableCopyHistory`

- **Objetivo / problema:** decidir qué ejemplar disponible conviene priorizar o inspeccionar según su uso y tiempo desde su último préstamo.
- **Colecciones:** `copies`, `books`, `loans`.
- **Operadores:** `$match`, `$lookup`, `$unwind`, `$addFields`, `$filter`, `$map`, `$setUnion`, `$dateDiff`, `$avg`, `$sort`, `$limit`.
- **Cálculos:** préstamos y prestatarios únicos por ejemplar, fecha del último préstamo, duración media de préstamos devueltos y días desde el último movimiento.
- **Por qué es avanzada:** integra el título con el historial individual del ejemplar y deriva métricas temporales sin multiplicar una fila por préstamo.
- **GraphQL ejecutable:**

```graphql
query EsausHistorialDeEjemplaresDisponibles {
  esauAvailableCopyHistory(genre: "Novela", limit: 50) {
    copyId inventoryCode title author genre totalLoans uniqueBorrowers
    lastLoanDate averageLoanDays daysSinceLastLoan
  }
}
```

- **Resultado real:** para Novela devolvió 30 ejemplares disponibles. Los primeros tienen un préstamo y un prestatario cada uno; las duraciones medias mostradas fueron 5, 25 y 15 días, y llevaban 30, 30 y 40 días desde el último préstamo. No hay historial repetido por ejemplar en estos datos.

### 6. Riesgo de desabasto — `esauSupplyRisk`

- **Objetivo / problema:** identificar títulos sin ejemplares, sin disponibilidad o con disponibilidad crítica para priorizar compras.
- **Colecciones:** `books`, `copies`, `loans`.
- **Operadores:** `$lookup`, `$addFields`, `$filter`, `$switch`, `$match`, `$cond`, `$divide`, `$sort`, `$limit`.
- **Cálculos:** ejemplares totales/disponibles, porcentaje de disponibilidad, demanda histórica, prestatarios y riesgo de stock.
- **Por qué es avanzada:** clasifica el riesgo combinando existencias con uso histórico, en vez de devolver un listado plano de inventario.
- **GraphQL ejecutable:**

```graphql
query EsausRiesgoDeDesabasto {
  esauSupplyRisk(limit: 50) {
    bookId title author genre totalCopies availableCopies availabilityPct
    totalLoans uniqueBorrowers demandPerAvailableCopy stockRisk
  }
}
```

- **Resultado real:** hay 700 libros sin ejemplares disponibles; la consulta devolvió los primeros 50 según demanda y disponibilidad. La muestra indica 1 ejemplar, 0 disponibles, 1 préstamo y riesgo `Sin disponibilidad`. `demandPerAvailableCopy` es nulo cuando el denominador es cero, no infinito.

### 7. Ranking de demanda — `esauBookDemandRanking`

- **Objetivo / problema:** priorizar títulos según recurrencia reciente, prestatarios, atrasos y capacidad disponible.
- **Colecciones:** `books`, `copies`, `loans`.
- **Operadores:** `$lookup`, `$filter`, `$addFields`, `$match`, `$cond`, `$max`, `$divide`, `$multiply`, `$round`, `$sort`.
- **Cálculos:** préstamos de 90 días, tasa de atraso y un puntaje de demanda que ajusta circulación por inventario y disponibilidad.
- **Por qué es avanzada:** el ranking combina demanda, riesgo de atraso y oferta; no ordena únicamente por un conteo.
- **GraphQL ejecutable:**

```graphql
query EsausRankingDeDemanda {
  esauBookDemandRanking(limit: 20) {
    bookId title author genre totalLoans uniqueBorrowers loansLast90Days
    availabilityPct overdueRatePct demandScore
  }
}
```

- **Resultado real:** devolvió 20 títulos; la muestra tiene 1 préstamo y 1 prestatario por libro, una disponibilidad de 0%, y puntaje 1. Los puestos están empatados y no deben interpretarse como evidencia de títulos más populares.

### 8. Utilización del inventario por género — `esauGenreUtilization`

- **Objetivo / problema:** medir qué parte del inventario está prestada y cuánto historial de uso tiene por género.
- **Colecciones:** `copies`, `books`, `loans`.
- **Operadores:** `$lookup`, `$unwind`, `$addFields`, `$map`, `$group`, `$push`, `$reduce`, `$setUnion`, `$project`.
- **Cálculos:** disponibilidad, utilización, eventos de préstamo por ejemplar y prestatarios únicos deduplicados entre ejemplares.
- **Por qué es avanzada:** conserva una fila por ejemplar durante el join y aplana conjuntos de prestatarios después de agrupar, evitando que el historial infle el número de ejemplares.
- **GraphQL ejecutable:**

```graphql
query EsausUtilizacionDeInventarioPorGenero {
  esauGenreUtilization {
    genre totalCopies availableCopies loanedCopies maintenanceCopies utilizedCopies
    utilizationPct loanEvents loansPerCopy uniqueBorrowers
  }
}
```

- **Resultado real:** devolvió 10 géneros. Biografía tiene 100 ejemplares, 70 prestados, utilización de 70%, 100 eventos, 1 préstamo por ejemplar y 100 prestatarios únicos. La misma distribución por género refleja el diseño uniforme de la muestra.

### 9. Salud del catálogo — `esauCatalogHealth`

- **Objetivo / problema:** obtener un tablero global que detecte títulos sin inventario o disponibilidad y compare catálogo, existencias y circulación.
- **Colecciones:** `books`, `copies`, `loans`.
- **Operadores:** `$lookup`, `$facet`, `$unwind`, `$group`, `$filter`, `$cond`, `$size`, `$arrayElemAt`, `$ifNull`, `$round`.
- **Cálculos:** cobertura de ejemplares, libros sin disponibilidad, existencias, porcentaje disponible, eventos recientes y diversidad de autores.
- **Por qué es avanzada:** separa en `$facet` los cálculos por libro, por ejemplar y por préstamo; así evita la multiplicación cartesiana entre copias e historial.
- **GraphQL ejecutable:**

```graphql
query EsausSaludDelCatalogo {
  esauCatalogHealth {
    totalBooks booksWithCopies booksWithoutCopies booksWithoutAvailability
    totalCopies availableCopies availabilityPct totalLoanEvents loansLast90Days
    distinctAuthors
  }
}
```

- **Resultado real:** 1,000 libros; los 1,000 tienen ejemplar; ninguno carece de ejemplares, pero 700 no tienen disponibilidad. Hay 1,000 copias, 300 disponibles (30%), 1,000 eventos, 800 en los últimos 90 días y 1,000 autores.

### 10. Demanda contra disponibilidad — `esauBookDemandSupply`

- **Objetivo / problema:** encontrar títulos con demanda reciente y ordenar su presión de demanda por cada ejemplar libre.
- **Colecciones:** `books`, `copies`, `loans`.
- **Operadores:** `$lookup`, `$filter`, `$addFields`, `$match`, `$switch`, `$cond`, `$divide`, `$sort`, `$limit`.
- **Cálculos:** préstamos de 90 días, prestatarios, porcentaje disponible, demanda por ejemplar libre y clase de demanda.
- **Por qué es avanzada:** contrasta eventos recientes con capacidad operativa y asigna una categoría basada en stock y recurrencia.
- **GraphQL ejecutable:**

```graphql
query EsausDemandaContraDisponibilidad {
  esauBookDemandSupply(limit: 50) {
    bookId title author genre totalCopies availableCopies availabilityPct
    loansLast90Days uniqueBorrowers demandPerAvailableCopy demandClass
  }
}
```

- **Resultado real:** devolvió 50 títulos con al menos un préstamo reciente; la muestra tiene 1 ejemplar disponible, 1 préstamo en 90 días, 100% de disponibilidad y clase `Demanda reciente`. Como ningún título se repite en los préstamos, no hay una demanda recurrente diferenciable.

## 10 consultas avanzadas de Miguel

### 11. Tendencia de préstamos por estado — `miguelLoanStatusTrend`

- **Objetivo / problema:** comparar el volumen de préstamos por estado en los últimos 30 días contra los 30 días anteriores.
- **Colecciones:** `loans`.
- **Operadores:** `$facet`, `$match`, `$group`, `$map`, `$setUnion`, `$unwind`, `$filter`, `$let`, `$arrayElemAt`, `$cond`.
- **Cálculos:** conteo por estado y variación porcentual entre ventanas; un estado nuevo sin período previo se expresa como `null`.
- **Por qué es avanzada:** calcula dos poblaciones temporales independientes y las reconcilia por estado, incluso cuando un estado solo aparece en una ventana.
- **GraphQL ejecutable:**

```graphql
query MiguelsTendenciasDePrestamosPorEstado {
  miguelLoanStatusTrend {
    status currentPeriodLoans previousPeriodLoans changePct
  }
}
```

- **Resultado real:** 3 estados. En la ventana actual hubo 500 activos y 15 vencidos; en la anterior hubo 65 vencidos y 70 devueltos. Los vencidos bajaron 76.9%; los activos no tienen base anterior (cambio `null`), por lo que no se reporta un porcentaje engañoso.

### 12. Exposición por retrasos — `miguelOverdueExposure`

- **Objetivo / problema:** identificar préstamos vencidos, responsables y títulos afectados para priorizar seguimiento.
- **Colecciones:** `loans`, `users`, `copies`, `books`.
- **Operadores:** `$match`, `$lookup`, `$unwind`, `$dateDiff`, `$switch`, `$project`, `$sort`, `$limit`.
- **Cálculos:** días de atraso y banda de severidad (1–6, 7–29, 30 o más).
- **Por qué es avanzada:** enlaza la obligación con el usuario, el ejemplar y el título, y calcula antigüedad con fechas actuales.
- **GraphQL ejecutable:**

```graphql
query MiguelsExposicionPorRetrasos {
  miguelOverdueExposure(limit: 50) {
    loanId userName email inventoryCode title genre dueDate daysOverdue overdueBand
  }
}
```

- **Resultado real:** existen 200 préstamos vencidos; la consulta muestra hasta 50. La muestra más antigua tiene 100 días de atraso y cae en `30 días o más`.

### 13. Desempeño de usuarios — `miguelBorrowerPerformance`

- **Objetivo / problema:** evaluar préstamos, devoluciones tardías, libros distintos y duración por usuario.
- **Colecciones:** `loans`, `copies`, `books`, `users`.
- **Operadores:** `$lookup`, `$unwind`, `$addFields`, `$dateDiff`, `$group`, `$addToSet`, `$cond`, `$avg`, `$sort`.
- **Cálculos:** préstamos totales, devueltos/vencidos, devoluciones tardías, puntualidad, títulos distintos y días medios de préstamo.
- **Por qué es avanzada:** consolida eventos históricos por usuario con sus títulos y evalúa fechas de devolución contra vencimiento.
- **GraphQL ejecutable:**

```graphql
query MiguelsDesempenoDeUsuarios {
  miguelBorrowerPerformance(limit: 50) {
    userId fullName totalLoans returnedLoans overdueLoans lateReturns onTimeReturns
    uniqueBooks averageLoanDays lateReturnPct
  }
}
```

- **Resultado real:** la muestra ordenada tiene 1 préstamo por usuario; algunos usuarios tienen una devolución tardía de una (100%) y 28 días de duración. El porcentaje es aritméticamente correcto, pero no representa desempeño estable con una sola observación por persona.

### 14. Tendencia mensual de devoluciones — `miguelMonthlyReturnTrend`

- **Objetivo / problema:** observar cambios mensuales de volumen y puntualidad de devoluciones.
- **Colecciones:** `loans`.
- **Operadores:** `$match`, `$year`, `$month`, `$group`, `$cond`, `$setWindowFields`, `$shift`, `$sort`.
- **Cálculos:** devoluciones y atrasos por mes, porcentaje puntual y cambio respecto del mes observado anterior.
- **Por qué es avanzada:** combina cohortes mensuales, puntualidad y una ventana analítica para comparar períodos.
- **GraphQL ejecutable:**

```graphql
query MiguelsTendenciaDevolucionesPorMes {
  miguelMonthlyReturnTrend {
    year month returnedLoans lateReturns onTimeRatePct previousMonthReturns changePct
  }
}
```

- **Resultado real:** 5 meses. La primera fila tiene 45 devoluciones y 25 tardías (44.4% puntual); la siguiente tiene 50 devoluciones, 30 tardías y un aumento de 11.1%. El historial actual solo cubre unos meses de 2026.

### 15. Antigüedad de retrasos por género — `miguelOverdueAging`

- **Objetivo / problema:** decidir dónde enfocar recordatorios según género y antigüedad de vencimientos.
- **Colecciones:** `loans`, `copies`, `books`.
- **Operadores:** `$match`, `$lookup`, `$unwind`, `$dateDiff`, `$switch`, `$group`, `$addToSet`, `$setWindowFields`, `$cond`, `$round`.
- **Cálculos:** préstamos y prestatarios afectados por banda, atraso medio y participación de cada banda dentro del género.
- **Por qué es avanzada:** crea bandas temporales y calcula porcentajes con particiones por género, evitando comparar géneros de distinto volumen sin contexto.
- **GraphQL ejecutable:**

```graphql
query MiguelsAntiguedadDeRetrasosPorGenero {
  miguelOverdueAging {
    genre overdueBand overdueLoans affectedBorrowers averageDaysOverdue genreOverduePct
  }
}
```

- **Resultado real:** 20 filas (género × banda). En Biografía: 15 casos de 30 días o más (75%, media 70 días) y 5 casos de 7–29 días (25%, media 22 días). No se observaron casos en la banda de 1–6 días.

### 16. Portafolio actual de préstamos — `miguelCurrentLoanPortfolio`

- **Objetivo / problema:** revisar obligaciones activas y vencidas junto con el usuario y el material prestado.
- **Colecciones:** `loans`, `users`, `copies`, `books`.
- **Operadores:** `$match`, `$lookup`, `$unwind`, `$addFields`, `$cond`, `$dateDiff`, `$sort`, `$limit`.
- **Cálculos:** estado efectivo recalculado por fecha, días restantes o de retraso y datos del libro/usuario.
- **Por qué es avanzada:** reúne cuatro colecciones y no confía exclusivamente en un estado almacenado cuando la fecha permite identificar que el préstamo ya venció.
- **GraphQL ejecutable:**

```graphql
query MiguelsPortafolioActualDePrestamos {
  miguelCurrentLoanPortfolio(limit: 50) {
    loanId userName email inventoryCode title genre loanDate dueDate
    effectiveStatus daysRemaining daysOverdue
  }
}
```

- **Resultado real:** devolvió 50 filas de hasta 700 préstamos activos o vencidos. La muestra más antigua corresponde a un vencimiento efectivo de 100 días; los campos distinguen atraso de días restantes.

### 17. Circulación por género — `miguelGenreCirculation`

- **Objetivo / problema:** comparar actividad, atrasos y devoluciones de los géneros.
- **Colecciones:** `loans`, `copies`, `books`.
- **Operadores:** `$lookup`, `$unwind`, `$addFields`, `$dateDiff`, `$group`, `$addToSet`, `$cond`, `$avg`, `$sort`.
- **Cálculos:** conteo por estado, libros y prestatarios únicos, devoluciones tardías, tasa de atraso y duración media.
- **Por qué es avanzada:** combina relaciones de circulación y calcula métricas de calidad y diversidad por cohorte.
- **GraphQL ejecutable:**

```graphql
query MiguelsCirculacionPorGenero {
  miguelGenreCirculation {
    genre totalLoans activeLoans overdueLoans returnedLoans uniqueBorrowers
    uniqueBooks lateReturns lateReturnPct averageLoanDays
  }
}
```

- **Resultado real:** 10 géneros; Biografía tiene 100 préstamos, 50 activos, 20 vencidos y 30 devueltos; 100 usuarios y libros distintos, 18 devoluciones tardías (60%) y 17 días medios. Los valores semejantes en todos los géneros son consecuencia de la generación balanceada.

### 18. Comparación de períodos — `miguelLoanPeriodComparison`

- **Objetivo / problema:** comparar el volumen global de préstamos y sus estados entre los últimos dos períodos de 30 días.
- **Colecciones:** `loans`.
- **Operadores:** `$facet`, `$match`, `$group`, `$cond`, `$arrayElemAt`, `$ifNull`, `$divide`, `$round`, `$dateToString`.
- **Cálculos:** totales, devoluciones y vencimientos por período, cambio porcentual y límites temporales exactos.
- **Por qué es avanzada:** calcula dos cohortes con `$facet` y devuelve una comparación compacta incluso si una de ellas está vacía.
- **GraphQL ejecutable:**

```graphql
query MiguelsComparacionDePeriodos {
  miguelLoanPeriodComparison {
    currentPeriodLoans previousPeriodLoans currentReturnedLoans previousReturnedLoans
    currentOverdueLoans previousOverdueLoans changePct currentPeriodStart previousPeriodStart
  }
}
```

- **Resultado real:** 515 préstamos actuales frente a 135 anteriores (+281.5%); 0 frente a 70 devueltos y 15 frente a 65 vencidos. La subida refleja los 500 préstamos activos concentrados en las fechas recientes del conjunto, no un patrón histórico de largo plazo.

### 19. Segmentación de usuarios — `miguelBorrowerSegments`

- **Objetivo / problema:** distinguir usuarios sin actividad, ocasionales, recurrentes y frecuentes, y detectar segmentos con vencimientos.
- **Colecciones:** `users`, `loans`, `copies`, `books`.
- **Operadores:** `$lookup` correlacionado, `$match`, `$unwind`, `$group`, `$addFields`, `$switch`, `$size`, `$avg`, `$sort`.
- **Cálculos:** volumen por usuario, libros/géneros, segmento, promedio de préstamos, diversidad de géneros y usuarios con vencidos.
- **Por qué es avanzada:** crea perfiles individuales mediante un subpipeline con joins y luego agrega perfiles por segmento.
- **GraphQL ejecutable:**

```graphql
query MiguelsSegmentacionDeUsuarios {
  miguelBorrowerSegments {
    segment userCount averageLoans usersWithOverdue averageGenreDiversity
  }
}
```

- **Resultado real:** un solo segmento: 1,000 usuarios con `Un solo préstamo`, promedio 1, diversidad media 1 y 200 usuarios con préstamos vencidos. La falta de recurrencia hace que otros segmentos queden vacíos.

### 20. Eficiencia de devoluciones — `miguelReturnEfficiency`

- **Objetivo / problema:** comparar puntualidad y duración del ciclo de préstamo por género.
- **Colecciones:** `loans`, `copies`, `books`.
- **Operadores:** `$match`, `$lookup`, `$unwind`, `$addFields`, `$dateDiff`, `$max`, `$group`, `$cond`, `$avg`, `$addToSet`.
- **Cálculos:** devoluciones puntuales/tardías, porcentaje puntual, duración media, días de atraso medios (solo devoluciones tardías) y prestatarios distintos.
- **Por qué es avanzada:** combina tiempo de circulación, cumplimiento de vencimiento e inventario bibliográfico por género.
- **GraphQL ejecutable:**

```graphql
query MiguelsEficienciaDeDevoluciones {
  miguelReturnEfficiency {
    genre returnedLoans onTimeReturns lateReturns onTimeRatePct
    averageLoanDays averageDaysLate distinctBorrowers
  }
}
```

- **Resultado real:** 10 géneros con 30 devoluciones cada uno. Biografía: 12 puntuales y 18 tardías, 40% puntual, 17 días medios de préstamo y 8 días medios de retraso entre las devoluciones tardías. La distribución igual por género limita comparaciones más finas.

## Validación de solo lectura

- `npm test`: **8 pruebas aprobadas**, incluyendo los 20 ejemplos ejecutables y los CRUD.
- `npm run check:analytics`: ejecutó las 20 consultas contra Atlas sin errores y sin operaciones de escritura.
- La comprobación cruzada verificó que los totales agregados coincidan con los conteos de `books`, `copies` y `loans` (1,000 cada uno), evitando inflar inventario o circulación por los joins.
- `npm run verify:data`: lectura de conteos; no se ejecutó `npm run seed`.

Las consultas con rankings y segmentación están implementadas, pero sus conclusiones por entidad siguen siendo limitadas hasta que, con aprobación y respaldo, se agreguen historiales repetidos y varios ejemplares por título.
