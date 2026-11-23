require('dotenv').config();

const mongoose = require('mongoose');

async function checkDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Falta MONGODB_URI. Crea un archivo .env a partir de .env.example.');
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  await mongoose.connection.db.admin().ping();
  console.log('Conexión a MongoDB Atlas verificada (ping correcto).');
  await mongoose.disconnect();
}

checkDatabase().catch((error) => {
  console.error(`No se pudo verificar MongoDB: ${error.message}`);
  process.exitCode = 1;
});
