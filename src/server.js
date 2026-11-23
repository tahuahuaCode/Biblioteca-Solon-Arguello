require('dotenv').config();

const path = require('node:path');
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { ApolloServerPluginLandingPageLocalDefault } = require('@apollo/server/plugin/landingPage/default');
const { expressMiddleware } = require('@as-integrations/express4');
const { typeDefs, createResolvers } = require('./schema');
const { connectToBiblio } = require('./database');

async function start() {
  await connectToBiblio();

  const server = new ApolloServer({
    typeDefs,
    resolvers: createResolvers(),
    plugins: [ApolloServerPluginLandingPageLocalDefault()]
  });
  await server.start();

  const app = express();
  app.use('/graphql', express.json(), expressMiddleware(server));
  app.get('/health', (_, res) => res.json({ status: 'ok' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.get('/', (_, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => {
    console.log(`BIBLIO disponible en http://localhost:${port}`);
    console.log(`GraphQL y Apollo Sandbox en http://localhost:${port}/graphql`);
  });
}

start().catch((error) => {
  console.error(`No se pudo iniciar BIBLIO: ${error.message}`);
  process.exitCode = 1;
});
