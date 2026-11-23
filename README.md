# Biblioteca Solón Argüello

Sistema web de gestión bibliotecaria para organizar el catálogo, los usuarios, los ejemplares físicos y la circulación de préstamos.

## Descripción

Biblioteca Solón Argüello permite administrar libros y usuarios, consultar indicadores del catálogo y dar seguimiento a ejemplares prestados, pendientes de devolución o vencidos. La aplicación ofrece una interfaz web en español y una API GraphQL para las operaciones del sistema y sus análisis.

El proyecto fue desarrollado como entrega universitaria por:

| Integrante |
| --- |
| Esaú Efraín Pérez Tahuahua |
| Miguel Ángel Sandoval Ulloa |

## Tecnologías

| Tecnología | Función en el proyecto |
| --- | --- |
| JavaScript | Lenguaje utilizado en el servidor, la interfaz y las pruebas. |
| Node.js | Entorno de ejecución del servidor y de los comandos del proyecto. |
| Express | Sirve los archivos de la interfaz y conecta el servidor web con GraphQL. |
| GraphQL | Define las consultas y mutaciones para el catálogo, los usuarios, el inventario y los préstamos. |
| Apollo Server | Ejecuta la API GraphQL y habilita Apollo Sandbox en desarrollo local. |
| MongoDB Atlas | Almacena los libros, usuarios, ejemplares físicos y préstamos. |
| Mongoose | Define los modelos, validaciones y conexión a MongoDB. |
| HTML, CSS y JavaScript | Construyen la interfaz que se entrega desde `public/`. |
| dotenv | Carga en el proceso las variables locales definidas en `.env`. |
| Node.js Test Runner | Ejecuta las pruebas automatizadas con `node --test`. |

## ¿Por qué MongoDB en lugar de Neo4j?

El sistema trabaja principalmente con registros de libros, usuarios, ejemplares y préstamos, además de consultas de inventario y agregaciones analíticas. MongoDB permite almacenar esos registros en colecciones, relacionarlos mediante identificadores y consultar los indicadores requeridos; Mongoose también ofrece modelos y validaciones alineados con la aplicación. Neo4j es una alternativa sólida cuando el problema requiere recorridos y análisis intensivos de relaciones como grafo. Para las operaciones y consultas implementadas en este proyecto, MongoDB cubre las necesidades sin incorporar otra base de datos.

## Arquitectura

1. El navegador carga la interfaz estática desde `public/`.
2. El código de la interfaz envía consultas y mutaciones GraphQL a Express en `/graphql`.
3. Apollo Server resuelve las operaciones del esquema, combinando CRUD, operaciones de biblioteca y consultas analíticas.
4. Los resolvers usan Mongoose para consultar y actualizar las colecciones de MongoDB Atlas. La conexión selecciona la base de datos `biblio`.

Las colecciones corresponden a `books`, `users`, `copies` y `loans`. Cada ejemplar referencia un libro; cada préstamo referencia un usuario y un ejemplar. Los análisis avanzados combinan estos registros mediante agregaciones de MongoDB.

## Estructura del proyecto

```text
.
├── public/                 # Interfaz web: HTML, CSS y JavaScript
├── queries/                # Ejemplos ejecutables de las 20 consultas avanzadas
├── src/
│   ├── models/             # Modelos Mongoose de libros, usuarios, ejemplares y préstamos
│   ├── advanced-analytics.js
│   ├── analytics.js        # Consultas analíticas previas y de compatibilidad
│   ├── library-operations.js
│   ├── schema.js           # Esquema y resolvers GraphQL
│   ├── server.js           # Servidor Express y Apollo Server
│   ├── database.js         # Conexión a MongoDB
│   └── ...                 # Verificación, respaldo y utilidades de datos
├── test/                   # Pruebas automatizadas
├── .env.example            # Plantilla de variables de entorno
├── .gitignore
├── CONSULTAS_COMPLEJAS.md  # Descripción técnica de las 20 consultas avanzadas
├── package.json
└── package-lock.json
```

En el repositorio, `.gitignore` excluye `.env`, `node_modules/`, `backups/` y `EVIDENCIAS/`. Los respaldos y las evidencias locales no forman parte del código publicado.

## Funcionalidades

- **Panel de inicio:** estadísticas de libros, usuarios, ejemplares disponibles, préstamos activos y vencidos; muestra préstamos recientes y vencidos.
- **Libros:** crear, consultar, editar y eliminar registros; búsqueda por título, autor, género o ISBN, filtro por género y paginación.
- **Usuarios:** crear, consultar, editar y eliminar registros; búsqueda por nombre o correo y paginación.
- **Ejemplares físicos:** registrar ejemplares para un libro y consultar sus códigos de inventario y estados disponibles, prestados o en mantenimiento.
- **Préstamos:** registrar préstamos de ejemplares disponibles a usuarios registrados; consultar, buscar, filtrar por estado y paginar los resultados.
- **Devoluciones:** registrar la devolución de un préstamo, revisar el historial y consultar préstamos vencidos o pendientes.
- **Consultas analíticas:** explorar disponibilidad y demanda, circulación, retrasos, puntualidad, actividad de usuarios y salud del catálogo.

## Requisitos e instalación

- Node.js 20 o posterior.
- npm, incluido con Node.js.
- Una instancia de MongoDB Atlas con acceso de red y credenciales configuradas para el entorno de ejecución.

Desde la carpeta del proyecto, instala las dependencias usando el archivo de bloqueo:

```bash
npm ci
```

### Variables de entorno

1. Crea una copia local de `.env.example` llamada `.env`.

   En PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   En macOS o Linux:

   ```bash
   cp .env.example .env
   ```

2. Edita `.env` en tu equipo y configura `MONGODB_URI` con la URI de conexión de tu propio entorno Atlas. Puedes ajustar `PORT` si el puerto predeterminado está ocupado.
3. No compartas ni subas `.env`. El proyecto carga estas variables mediante `dotenv`; la conexión usa la base de datos `biblio`.

`.env.example` contiene únicamente nombres de variables y valores de referencia, no credenciales funcionales. No pegues credenciales reales en el README, en capturas ni en el repositorio.

## Ejecución

Modo de desarrollo, con reinicio al detectar cambios:

```bash
npm run dev
```

Modo normal:

```bash
npm start
```

Si no se define `PORT`, el servidor usa el puerto `4000`. Con la configuración predeterminada, abre:

- **Interfaz:** [http://localhost:4000/](http://localhost:4000/)
- **Apollo Sandbox / API GraphQL:** [http://localhost:4000/graphql](http://localhost:4000/graphql)
- **Comprobación de estado del servidor:** [http://localhost:4000/health](http://localhost:4000/health)

Si cambiaste `PORT`, sustituye `4000` en estas direcciones por el puerto configurado. La ruta `/users.html` redirige a la sección de usuarios de la interfaz principal.

## Las 20 consultas avanzadas

Las consultas están organizadas en diez ejemplos de Esaú y diez de Miguel. Los documentos GraphQL listos para seleccionar y ejecutar desde Apollo Sandbox están en [`queries/esau.graphql`](./queries/esau.graphql) y [`queries/miguel.graphql`](./queries/miguel.graphql). Sus tipos y resolvers están implementados en [`src/advanced-analytics.js`](./src/advanced-analytics.js) y se integran al esquema en [`src/schema.js`](./src/schema.js). La explicación de objetivos, cálculos y limitaciones está en [`CONSULTAS_COMPLEJAS.md`](./CONSULTAS_COMPLEJAS.md).

| # | Campo GraphQL | Qué analiza |
| ---: | --- | --- |
| 1 | `esauAvailabilityByGenre` | Disponibilidad, utilización e indicadores recientes de demanda por género. |
| 2 | `esauAuthorCirculation` | Libros, ejemplares, préstamos, prestatarios y devoluciones tardías por autor. |
| 3 | `esauDecadeCirculation` | Circulación, inventario y disponibilidad por década de publicación. |
| 4 | `esauGenrePeriodAnalysis` | Cambio de préstamos entre períodos comparables por género. |
| 5 | `esauAvailableCopyHistory` | Historial de préstamos de ejemplares que actualmente están disponibles. |
| 6 | `esauSupplyRisk` | Disponibilidad y señales de riesgo de desabasto por libro. |
| 7 | `esauBookDemandRanking` | Ranking de demanda por libro, incluidos préstamos recientes y atrasos. |
| 8 | `esauGenreUtilization` | Uso del inventario y circulación por género. |
| 9 | `esauCatalogHealth` | Resumen de cobertura del catálogo, ejemplares y disponibilidad. |
| 10 | `esauBookDemandSupply` | Comparación de demanda reciente y existencias por libro. |
| 11 | `miguelLoanStatusTrend` | Cambio de préstamos por estado entre períodos. |
| 12 | `miguelOverdueExposure` | Préstamos vencidos, días de retraso y bandas de antigüedad. |
| 13 | `miguelBorrowerPerformance` | Actividad, devoluciones, puntualidad y diversidad de libros por usuario. |
| 14 | `miguelMonthlyReturnTrend` | Tendencia mensual de devoluciones y puntualidad. |
| 15 | `miguelOverdueAging` | Antigüedad y distribución de los retrasos por género. |
| 16 | `miguelCurrentLoanPortfolio` | Préstamos activos o vencidos, fechas límite y días restantes o de retraso. |
| 17 | `miguelGenreCirculation` | Préstamos, devoluciones, retrasos y participantes por género. |
| 18 | `miguelLoanPeriodComparison` | Comparación de volumen, devoluciones y vencimientos entre dos períodos. |
| 19 | `miguelBorrowerSegments` | Segmentos de usuarios según su actividad y diversidad de géneros. |
| 20 | `miguelReturnEfficiency` | Puntualidad, duración y retraso de las devoluciones por género. |

Las consultas también usan límites para algunos resultados; sus valores y validaciones pueden revisarse en los ejemplos GraphQL y en la documentación técnica.

## Pruebas y verificaciones

Ejecuta la suite automatizada con:

```bash
npm test
```

Este comando ejecuta `node --test` sobre las pruebas de `test/`. El proyecto también define estos comandos de verificación, que requieren las variables locales correspondientes:

```bash
npm run check:db
npm run verify:data
npm run check:analytics
```

`check:db` comprueba la conexión; `verify:data` revisa los datos y `check:analytics` ejecuta verificaciones de las consultas analíticas. Las comprobaciones que acceden a Atlas deben usarse únicamente con una base de datos propia o autorizada.

## Flujo de uso: libro, ejemplar, préstamo y devolución

El flujo también se puede realizar desde las secciones **Libros**, **Préstamos** y **Devoluciones** de la interfaz. En Apollo Sandbox, las siguientes operaciones ilustran las mutaciones disponibles; sustituye cada variable por un identificador obtenido de tu propia base de pruebas.

1. **Registrar el libro.** Ejecuta `createBook` con un `BookInput` que incluya `title`, `author` e `isbn`; `publishedYear` y `genre` son opcionales. Guarda el `id` devuelto.

   ```graphql
   mutation CrearLibro($input: BookInput!) {
     createBook(input: $input) {
       id
       title
       author
       isbn
     }
   }
   ```

2. **Agregar un ejemplar físico.** Usa el identificador del libro. La respuesta incluye el ID del ejemplar y su código de inventario generado por el sistema.

   ```graphql
   mutation AgregarEjemplar($bookId: ID!) {
     addBookCopy(bookId: $bookId) {
       id
       inventoryCode
       status
     }
   }
   ```

3. **Registrar el préstamo.** `registerLoan` recibe un `NewLoanInput` con `bookId`, `copyId`, `userId`, `loanDate` y `dueDate`. Usa un usuario previamente registrado y un ejemplar disponible; las fechas se envían como texto en formato `AAAA-MM-DD`.

   ```graphql
   mutation RegistrarPrestamo($input: NewLoanInput!) {
     registerLoan(input: $input) {
       loanId
       status
       copyStatus
       loanDate
       dueDate
     }
   }
   ```

4. **Registrar la devolución.** Utiliza el `loanId` devuelto por el préstamo y `returnDate` en formato `AAAA-MM-DD`.

   ```graphql
   mutation RegistrarDevolucion($loanId: ID!, $returnDate: String!) {
     registerReturn(loanId: $loanId, returnDate: $returnDate) {
       loanId
       status
       copyStatus
       returnDate
     }
   }
   ```

## Visita a la biblioteca y recomendaciones recibidas

El 23 de noviembre de 2026, el equipo presentó el sistema de gestión bibliotecaria al personal de la Biblioteca Solón Argüello para mostrar su funcionamiento, conocer su opinión y recibir recomendaciones. Durante la entrevista, el personal sugirió:

- Reemplazar el nombre principal “BIBLIO” por el nombre de la institución: **Biblioteca Solón Argüello**.
- Dar a la interfaz una apariencia más formal, con blanco y gris claro, y usar el color tinto en la barra superior.
- Añadir una sección que permita consultar los libros prestados, quién es responsable de cada préstamo y sus fechas.
- Incorporar información para dar seguimiento a préstamos pendientes, devoluciones y retrasos.

Después de la visita, el equipo incorporó estas mejoras en la interfaz y amplió el flujo de gestión con ejemplares físicos, registro de préstamos y devoluciones, búsqueda y paginación. Los buscadores de libros y usuarios se añadieron por iniciativa del equipo para facilitar la localización de información. Esta descripción recoge las recomendaciones compartidas por el equipo; no implica un visto bueno formal de la institución.


## Video de presentación

Como parte del proyecto, se realizó una visita a la Biblioteca Solón Argüello para presentar el sistema desarrollado y recibir recomendaciones del personal.

Durante la entrevista se abordaron aspectos relacionados con el diseño de la interfaz, la gestión de libros, los préstamos y las devoluciones.

Las sugerencias recibidas permitieron mejorar el sistema y adaptarlo a las necesidades identificadas durante la visita.

**Video de la entrevista y presentación:**

https://youtu.be/AOY_diBiPic

## Seguridad y datos de prueba

- Mantén las credenciales de MongoDB Atlas únicamente en el `.env` local. No publiques ese archivo, capturas que muestren su contenido ni URI de conexión.
- No subas datos personales de usuarios, archivos de respaldo ni información de acceso a la base de datos. Los respaldos pueden contener los documentos completos y deben tratarse como información privada.
- Para demostraciones y pruebas manuales, usa datos ficticios o autorizados y una base de datos de prueba; evita modificar datos reales de la biblioteca.
- `npm run seed` está definido en `package.json`, pero realiza operaciones de escritura. No lo ejecutes contra una base con datos reales o compartidos; no es necesario para correr `npm test`.

## Documento técnico comparativo

Se realizó una investigación comparativa entre MongoDB y Neo4j
para determinar cuál se adapta mejor a las necesidades del proyecto.

[Consultar documento técnico MongoDB vs. Neo4j](docs/Biblioteca_Solon_Arguello_Comparativo_Tecnico.docx)
