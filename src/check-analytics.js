require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const { parse, Kind } = require('graphql');
const { ApolloServer } = require('@apollo/server');
const mongoose = require('mongoose');
const { connectToBiblio } = require('./database');
const { typeDefs, createResolvers } = require('./schema');
const Book = require('./models/book');
const User = require('./models/user');
const Copy = require('./models/copy');
const Loan = require('./models/loan');

const reportFields = new Set([
  'genre', 'status', 'decade', 'totalBooks', 'totalCopies', 'availableCopies', 'loanedCopies',
  'maintenanceCopies', 'availabilityPct', 'utilizationPct', 'totalLoans', 'loansLast30Days',
  'loansPrevious30Days', 'demandChangePct', 'loansPerCopy', 'bookCount', 'lateReturns',
  'lateReturnPct', 'loansPerBook', 'currentPeriodLoans', 'previousPeriodLoans', 'loansPerAvailableCopy',
  'uniqueBorrowers', 'averageLoanDays', 'daysSinceLastLoan', 'loansLast90Days', 'overdueRatePct',
  'demandScore', 'utilizedCopies', 'loanEvents', 'totalLoanEvents', 'booksWithCopies',
  'booksWithoutCopies', 'booksWithoutAvailability', 'distinctAuthors', 'demandPerAvailableCopy',
  'stockRisk', 'demandClass', 'currentPeriodStart', 'previousPeriodStart', 'currentReturnedLoans',
  'previousReturnedLoans', 'currentOverdueLoans', 'previousOverdueLoans', 'changePct', 'overdueBand',
  'daysOverdue', 'returnedLoans', 'onTimeReturns', 'onTimeRatePct', 'previousMonthReturns',
  'affectedBorrowers', 'averageDaysOverdue', 'genreOverduePct', 'effectiveStatus', 'daysRemaining',
  'activeLoans', 'overdueLoans', 'uniqueBooks', 'averageGenreDiversity', 'segment', 'userCount',
  'usersWithOverdue', 'averageLoans', 'returnedLoans', 'totalReturned', 'averageDaysLate',
  'distinctBorrowers', 'averageLoanDays', 'earliestPublicationYear', 'latestPublicationYear',
  'averagePublicationYear'
]);

function safeSample(value) {
  const rows = Array.isArray(value) ? value.slice(0, 3) : [value];
  return rows.map((row) => Object.fromEntries(
    Object.entries(row || {}).filter(([key]) => reportFields.has(key))
  ));
}

async function checkAnalytics() {
  await connectToBiblio();
  const server = new ApolloServer({ typeDefs, resolvers: createResolvers() });
  const resultsByField = {};

  try {
    await server.start();
    for (const file of ['esau.graphql', 'miguel.graphql']) {
      const source = await fs.readFile(path.join(__dirname, '..', 'queries', file), 'utf8');
      const operations = parse(source).definitions.filter(
        (definition) => definition.kind === Kind.OPERATION_DEFINITION
      );

      for (const operation of operations) {
        const operationName = operation.name.value;
        const response = await server.executeOperation({ query: source, operationName });
        const result = response.body.singleResult;
        if (result.errors?.length) {
          throw new Error(`${operationName}: ${result.errors[0].message}`);
        }

        const [field, value] = Object.entries(result.data)[0];
        resultsByField[field] = value;
        const summary = Array.isArray(value) ? `${value.length} filas` : 'estadística obtenida';
        console.log(`${operationName}: OK (${field}, ${summary}); muestra ${JSON.stringify(safeSample(value))}.`);
      }
    }

    const [bookCount, userCount, copyCount, loanCount] = await Promise.all([
      Book.countDocuments({}).exec(),
      User.countDocuments({}).exec(),
      Copy.countDocuments({}).exec(),
      Loan.countDocuments({}).exec()
    ]);
    const inventoryRows = resultsByField.esauAvailabilityByGenre;
    const circulationRows = resultsByField.miguelGenreCirculation;
    const inventoryCopies = inventoryRows.reduce((total, row) => total + row.totalCopies, 0);
    const inventoryBooks = inventoryRows.reduce((total, row) => total + row.totalBooks, 0);
    const inventoryLoans = inventoryRows.reduce((total, row) => total + row.totalLoans, 0);
    const groupedCopies = resultsByField.esauGenreUtilization.reduce((total, row) => total + row.totalCopies, 0);
    const groupedLoanEvents = resultsByField.esauGenreUtilization.reduce((total, row) => total + row.loanEvents, 0);
    const genreLoans = circulationRows.reduce((total, row) => total + row.totalLoans, 0);
    const genreBooks = circulationRows.reduce((total, row) => total + row.uniqueBooks, 0);
    const segmentedUsers = resultsByField.miguelBorrowerSegments.reduce((total, row) => total + row.userCount, 0);
    const inventoryStatusTotal = inventoryRows.reduce(
      (total, row) => total + row.availableCopies + row.loanedCopies + row.maintenanceCopies,
      0
    );

    if (
      inventoryBooks !== bookCount ||
      inventoryCopies !== copyCount ||
      inventoryStatusTotal !== copyCount ||
      inventoryLoans !== loanCount ||
      groupedCopies !== copyCount ||
      groupedLoanEvents !== loanCount ||
      genreLoans !== loanCount ||
      genreBooks !== bookCount ||
      segmentedUsers !== userCount ||
      resultsByField.esauCatalogHealth.totalBooks !== bookCount ||
      resultsByField.esauCatalogHealth.totalCopies !== copyCount ||
      resultsByField.esauCatalogHealth.totalLoanEvents !== loanCount
    ) {
      throw new Error('Los totales agregados no coinciden con los documentos de las colecciones.');
    }

    console.log(`Totales cruzados sin duplicación: ${bookCount} libros, ${userCount} usuarios, ${copyCount} ejemplares, ${loanCount} préstamos.`);
    console.log('Las 20 consultas se ejecutaron contra la base biblio; no se modificaron documentos.');
  } finally {
    await server.stop();
    await mongoose.disconnect();
  }
}

checkAnalytics().catch((error) => {
  console.error(`No se pudieron comprobar las consultas analíticas: ${error.message}`);
  process.exitCode = 1;
});
