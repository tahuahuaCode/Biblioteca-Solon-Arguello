require('dotenv').config();

const mongoose = require('mongoose');
const Book = require('./models/book');
const User = require('./models/user');
const Copy = require('./models/copy');
const Loan = require('./models/loan');
const { connectToBiblio } = require('./database');

async function verifyData() {
  await connectToBiblio();
  try {
    const counts = await Promise.all([
      ['books', Book],
      ['users', User],
      ['copies', Copy],
      ['loans', Loan]
    ].map(async ([name, model]) => [
      name,
      await model.countDocuments({}).exec()
    ]));

    console.log('Conteo de documentos en la base biblio:');
    for (const [name, count] of counts) {
      console.log(`${name}: ${count}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

verifyData().catch((error) => {
  console.error(`No se pudo verificar biblio: ${error.message}`);
  process.exitCode = 1;
});
