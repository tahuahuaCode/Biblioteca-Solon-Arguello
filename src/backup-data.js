require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const { EJSON } = require('bson');
const mongoose = require('mongoose');
const { connectToBiblio } = require('./database');

const collectionNames = ['books', 'users', 'copies', 'loans'];

async function createBackup() {
  const connection = await connectToBiblio();
  const root = path.join(__dirname, '..', 'backups');
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
  const backupDirectory = path.join(root, `biblio-pre-analytics-${timestamp}`);

  try {
    await fs.mkdir(root, { recursive: true });
    await fs.mkdir(backupDirectory);

    const counts = {};
    for (const name of collectionNames) {
      const documents = await connection.db.collection(name).find({}).toArray();
      counts[name] = documents.length;
      await fs.writeFile(
        path.join(backupDirectory, `${name}.ejson`),
        EJSON.stringify(documents, null, 2, { relaxed: false }),
        'utf8'
      );
    }

    await fs.writeFile(
      path.join(backupDirectory, 'manifest.json'),
      JSON.stringify({ database: 'biblio', createdAt: new Date().toISOString(), counts }, null, 2),
      'utf8'
    );
    console.log(`Respaldo de solo lectura guardado en ${path.relative(process.cwd(), backupDirectory)}.`);
    console.log(`Conteos respaldados: ${collectionNames.map((name) => `${name}: ${counts[name]}`).join(', ')}.`);
  } finally {
    await mongoose.disconnect();
  }
}

createBackup().catch((error) => {
  console.error(`No se pudo completar el respaldo: ${error.message}`);
  process.exitCode = 1;
});
