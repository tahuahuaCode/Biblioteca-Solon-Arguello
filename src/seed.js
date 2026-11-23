require('dotenv').config();

const mongoose = require('mongoose');
const Book = require('./models/book');
const User = require('./models/user');
const Copy = require('./models/copy');
const Loan = require('./models/loan');
const { connectToBiblio } = require('./database');
const { RECORD_COUNT, createBooksAndUsers, createCopies, createLoans } = require('./seed-data');
const { assertEmptyCounts, assertExpectedCounts } = require('./seed-safety');

const collections = [
  ['books', Book],
  ['users', User],
  ['copies', Copy],
  ['loans', Loan]
];

async function getCounts(session) {
  const counts = {};
  for (const [name, model] of collections) {
    counts[name] = await model.countDocuments({}).session(session).exec();
  }
  return counts;
}

function formatCounts(counts) {
  return collections.map(([name]) => `${name}: ${counts[name]}`).join(', ');
}

async function seed() {
  await connectToBiblio();
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const currentCounts = await getCounts(session);
      console.log(`Conteos actuales en biblio: ${formatCounts(currentCounts)}.`);
      assertEmptyCounts(currentCounts);

      const { books, users } = createBooksAndUsers();
      const createdBooks = await Book.insertMany(books, { session });
      const createdUsers = await User.insertMany(users, { session });
      const createdCopies = await Copy.insertMany(createCopies(createdBooks), { session });
      const loans = createLoans(createdUsers, createdCopies);
      await Loan.insertMany(loans, { session });

      const insertedCounts = await getCounts(session);
      assertExpectedCounts(insertedCounts, RECORD_COUNT);
      console.log(
        `Carga verificada dentro de la transacción: ${RECORD_COUNT} libros, ${RECORD_COUNT} usuarios, ` +
        `${RECORD_COUNT} ejemplares y ${RECORD_COUNT} préstamos.`
      );
    });

    const finalCounts = await getCounts();
    assertExpectedCounts(finalCounts, RECORD_COUNT);
    console.log(`Conteos finales en biblio: ${formatCounts(finalCounts)}.`);
  } finally {
    await session.endSession();
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error(`No se pudo completar la carga: ${error.message}`);
  process.exitCode = 1;
});
