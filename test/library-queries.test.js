const test = require('node:test');
const assert = require('node:assert/strict');
const { ApolloServer } = require('@apollo/server');
const { createResolvers, typeDefs } = require('../src/schema');

function createModel(name, calls, count, aggregateResult = []) {
  return {
    countDocuments: async (filter) => {
      calls.counts.push({ model: name, filter });
      return count;
    },
    aggregate(pipeline) {
      calls.aggregates.push({ model: name, pipeline });
      return { exec: async () => aggregateResult };
    }
  };
}

async function createServer(calls) {
  const loan = {
    loanId: 'loan-1',
    title: 'Libro de prueba real',
    author: 'Autora',
    genre: 'Historia',
    userName: 'Persona registrada',
    email: 'persona@example.com',
    inventoryCode: 'INV-001',
    loanDate: '2026-11-20T00:00:00.000Z',
    dueDate: '2026-11-27T00:00:00.000Z',
    returnDate: null,
    status: 'active',
    daysRemaining: 4,
    daysOverdue: 0
  };
  const models = {
    Book: createModel('Book', calls, 1000),
    User: createModel('User', calls, 1000),
    Copy: createModel('Copy', calls, 1000),
    Loan: createModel('Loan', calls, 1000, [loan])
  };
  const server = new ApolloServer({ typeDefs, resolvers: createResolvers(models) });
  await server.start();
  return server;
}

test('el resumen del panel consulta conteos de las colecciones existentes', async () => {
  const calls = { counts: [], aggregates: [] };
  const server = await createServer(calls);
  try {
    const response = await server.executeOperation({
      query: '{ libraryOverview { totalBooks totalUsers totalCopies availableCopies totalLoans activeLoans overdueLoans returnedLoans } }'
    });
    const result = response.body.singleResult;
    assert.equal(result.errors, undefined);
    assert.equal(result.data.libraryOverview.totalBooks, 1000);
    assert.equal(result.data.libraryOverview.totalUsers, 1000);
    assert.equal(result.data.libraryOverview.totalCopies, 1000);
    assert.equal(result.data.libraryOverview.totalLoans, 1000);
    assert.equal(calls.counts.length, 8);
    assert.ok(calls.counts.some(({ filter }) => filter.status === 'available'));
  } finally {
    await server.stop();
  }
});

test('el listado de préstamos resuelve relaciones y rechaza estados desconocidos', async () => {
  const calls = { counts: [], aggregates: [] };
  const server = await createServer(calls);
  try {
    const response = await server.executeOperation({
      query: '{ libraryLoans(status: "active", limit: 20) { loanId title userName inventoryCode status daysRemaining } }'
    });
    const result = response.body.singleResult;
    assert.equal(result.errors, undefined);
    assert.equal(result.data.libraryLoans[0].title, 'Libro de prueba real');
    assert.equal(result.data.libraryLoans[0].userName, 'Persona registrada');
    const pipeline = calls.aggregates[0].pipeline;
    assert.equal(pipeline.filter((stage) => stage.$lookup).length, 3);
    assert.ok(pipeline.some((stage) => stage.$match?.effectiveStatus === 'active'));
    assert.ok(pipeline.some((stage) => stage.$addFields?.daysOverdue));

    const invalid = await server.executeOperation({
      query: '{ libraryLoans(status: "cancelled") { loanId } }'
    });
    assert.equal(invalid.body.singleResult.errors[0].extensions.code, 'BAD_USER_INPUT');
    assert.equal(calls.aggregates.length, 1);
  } finally {
    await server.stop();
  }
});
