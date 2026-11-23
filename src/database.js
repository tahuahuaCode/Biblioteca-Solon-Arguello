const mongoose = require('mongoose');

async function connectToBiblio() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Falta MONGODB_URI. Crea un archivo .env a partir de .env.example.');
  }

  await mongoose.connect(uri, {
    dbName: 'biblio',
    serverSelectionTimeoutMS: 10000
  });

  if (mongoose.connection.name !== 'biblio') {
    await mongoose.disconnect();
    throw new Error('La conexión no apunta a la base de datos biblio; operación cancelada.');
  }

  return mongoose.connection;
}

module.exports = { connectToBiblio };
