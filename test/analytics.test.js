const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ApolloServer } = require('@apollo/server');
const { createResolvers, typeDefs } = require('../src/schema');

function createAggregateModel(name, calls) {
  return {
    aggregate(pipeline) {
      calls.push({ model: name, pipeline });
      return { exec: async () => [] };
    }
  };
}

test('los 20 ejemplos GraphQL se ejecutan y usan agregaciones MongoDB', async () => {
  const calls = [];
  const models = {
    Book: createAggregateModel('Book', calls),
    User: createAggregateModel('User', calls),
    Copy: createAggregateModel('Copy', calls),
    Loan: createAggregateModel('Loan', calls)
  };
  const server = new ApolloServer({ typeDefs, resolvers: createResolvers(models) });
  await server.start();

  try {
    const exampleFiles = ['esau.graphql', 'miguel.graphql'];
    const operationNames = [];

    for (const file of exampleFiles) {
      const source = fs.readFileSync(path.join(__dirname, '..', 'queries', file), 'utf8');
      const names = [...source.matchAll(/query\s+([A-Za-z_][A-Za-z0-9_]*)/g)].map((match) => match[1]);
      operationNames.push(...names);

      for (const operationName of names) {
        const response = await server.executeOperation({ query: source, operationName });
        const result = response.body.singleResult;
        assert.equal(result.errors, undefined, `${operationName} returned GraphQL errors`);
        assert.ok(result.data);
      }
    }

    assert.equal(operationNames.length, 20);
    assert.equal(calls.length, 20);
    assert.ok(calls.every(({ pipeline }) => Array.isArray(pipeline) && pipeline.length > 0));
    assert.ok(calls.some(({ pipeline }) => pipeline.some((stage) => stage.$lookup)));
    assert.ok(calls.some(({ pipeline }) => pipeline.some((stage) => stage.$group)));
  } finally {
    await server.stop();
  }
});

test('las consultas analíticas rechazan límites fuera de rango', async () => {
  const emptyAggregateModel = { aggregate: () => ({ exec: async () => [] }) };
  const server = new ApolloServer({
    typeDefs,
    resolvers: createResolvers({
      Book: emptyAggregateModel,
      User: emptyAggregateModel,
      Copy: emptyAggregateModel,
      Loan: emptyAggregateModel
    })
  });
  await server.start();

  try {
    const response = await server.executeOperation({
      query: '{ esauBooksByAuthor(limit: 1000) { author bookCount genres } }'
    });
    assert.equal(response.body.singleResult.errors[0].extensions.code, 'BAD_USER_INPUT');
  } finally {
    await server.stop();
  }
});
