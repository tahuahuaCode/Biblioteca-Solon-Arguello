const test = require('node:test');
const assert = require('node:assert/strict');
const { ApolloServer } = require('@apollo/server');
const { createResolvers, typeDefs } = require('../src/schema');

const ids = {
  book: '507f1f77bcf86cd799439011',
  user: '507f1f77bcf86cd799439012',
  copy: '507f1f77bcf86cd799439013'
};

function query(getValue) {
  const options = {};
  const result = {
    session() { return this; },
    sort(value) { options.sort = value; return this; },
    skip(value) { options.skip = value; return this; },
    limit(value) { options.limit = value; return this; },
    exec: async () => getValue(options)
  };
  return result;
}

function matches(record, filter) {
  if (filter._id && String(record._id) !== String(filter._id)) return false;
  if (filter.book && String(record.book) !== String(filter.book)) return false;
  if (filter.copy && String(record.copy) !== String(filter.copy)) return false;
  if (filter.status && typeof filter.status === 'string' && record.status !== filter.status) return false;
  if (filter.status?.$in && !filter.status.$in.includes(record.status)) return false;
  if (filter.$or && !filter.$or.some((condition) => {
    const [field, regex] = Object.entries(condition)[0];
    return regex.test(String(record[field] ?? ''));
  })) return false;
  return true;
}

function createHarness() {
  const state = {
    books: [{ _id: ids.book, title: 'Libro de prueba', author: 'Autora', isbn: '9780000000001', genre: 'Historia' }],
    users: [{ _id: ids.user, fullName: 'Persona de prueba', email: 'persona@example.com' }],
    copies: [{ _id: ids.copy, book: ids.book, inventoryCode: 'INV-TEST-1', status: 'available' }],
    loans: [],
    failLoanCreate: false,
    failCopyCreate: false,
    failCopyRelease: false,
    copyOptions: [],
    aggregateCalls: [],
    loanPageResult: [{ items: [], totals: [{ total: 0 }] }],
    forcedInventoryCode: null
  };

  function modelFind(collection, filter = {}) {
    return query((options) => {
      let found = collection.filter((record) => matches(record, filter));
      const sortField = options.sort && Object.keys(options.sort)[0];
      if (sortField) {
        const direction = options.sort[sortField];
        found = [...found].sort((a, b) => String(a[sortField] ?? '').localeCompare(String(b[sortField] ?? '')) * direction);
      }
      if (options.skip != null) found = found.slice(options.skip);
      if (options.limit != null) found = found.slice(0, options.limit);
      return found;
    });
  }

  let nextBookId = 100;
  const Book = {
    collection: { name: 'books' },
    findById: (id) => query(() => state.books.find((item) => String(item._id) === String(id)) || null),
    find: (filter) => modelFind(state.books, filter),
    countDocuments: (filter) => query(() => state.books.filter((item) => matches(item, filter)).length),
    create: async (documents) => {
      const inputs = Array.isArray(documents) ? documents : [documents];
      const created = inputs.map((document) => ({
        _id: (nextBookId++).toString(16).padStart(24, '0'),
        ...document
      }));
      state.books.push(...created);
      return Array.isArray(documents) ? created : created[0];
    }
  };
  const User = {
    collection: { name: 'users' },
    findById: (id) => query(() => state.users.find((item) => String(item._id) === String(id)) || null),
    find: (filter) => modelFind(state.users, filter),
    countDocuments: (filter) => query(() => state.users.filter((item) => matches(item, filter)).length)
  };
  const Copy = {
    collection: { name: 'copies' },
    findById: (id) => query(() => state.copies.find((item) => String(item._id) === String(id)) || null),
    findOne: (filter) => query(() => state.copies.find((item) => matches(item, filter)) || null),
    findOneAndUpdate: (filter, update) => query(() => {
      if (state.failCopyRelease && update.$set.status === 'available') return null;
      const copy = state.copies.find((item) => matches(item, filter));
      if (!copy) return null;
      Object.assign(copy, update.$set);
      return copy;
    }),
    create: async (documents) => {
      if (state.failCopyCreate) throw new Error('Fallo de creación de ejemplar simulado');
      const created = documents.map((document) => {
        if (state.copies.some((copy) => copy.inventoryCode === document.inventoryCode)) {
          const error = new Error('duplicate key inventoryCode');
          error.code = 11000;
          error.keyPattern = { inventoryCode: 1 };
          throw error;
        }
        return {
          _id: (state.copies.length + 100).toString(16).padStart(24, '0'),
          ...document
        };
      });
      state.copies.push(...created);
      return created;
    },
    aggregate: (pipeline) => {
      state.aggregateCalls.push({ model: 'Copy', pipeline });
      return {
        exec: async () => {
          const hasFacet = pipeline.some((stage) => stage.$facet);
          const match = pipeline.find((stage) => stage.$match)?.$match || {};
          const bookId = match.book?.toString();
          const copies = state.copies.filter((copy) =>
            (!bookId || String(copy.book) === bookId)
            && (!match.status || copy.status === match.status)
          );
          if (hasFacet) {
            const items = copies
              .sort((left, right) => left.inventoryCode.localeCompare(right.inventoryCode))
              .map((copy) => ({
                id: String(copy._id),
                inventoryCode: copy.inventoryCode,
                status: copy.status
              }));
            const summary = copies.length ? [{
              total: copies.length,
              available: copies.filter((copy) => copy.status === 'available').length,
              loaned: copies.filter((copy) => copy.status === 'loaned').length,
              maintenance: copies.filter((copy) => copy.status === 'maintenance').length
            }] : [];
            return [{ items, summary }];
          }
          if (state.copyOptions.length) return state.copyOptions;
          return copies
            .filter((copy) => !state.loans.some((loan) => String(loan.copy) === String(copy._id)
              && ['active', 'overdue'].includes(loan.status)))
            .map((copy) => ({
              id: String(copy._id),
              inventoryCode: copy.inventoryCode,
              bookId: String(copy.book),
              title: state.books.find((book) => String(book._id) === String(copy.book))?.title
            }));
        }
      };
    }
  };
  let nextLoanId = 1;
  const Loan = {
    collection: { name: 'loans' },
    findById: (id) => query(() => state.loans.find((item) => String(item._id) === String(id)) || null),
    countDocuments: (filter) => query(() => state.loans.filter((item) => matches(item, filter)).length),
    findOneAndUpdate: (filter, update) => query(() => {
      const loan = state.loans.find((item) => matches(item, filter));
      if (!loan) return null;
      Object.assign(loan, update.$set);
      return loan;
    }),
    create: async (documents) => {
      if (state.failLoanCreate) throw new Error('Fallo de inserción simulado');
      const created = documents.map((document) => ({
        _id: (nextLoanId++).toString(16).padStart(24, '0'),
        ...document
      }));
      state.loans.push(...created);
      return created;
    },
    aggregate: (pipeline) => {
      state.aggregateCalls.push({ model: 'Loan', pipeline });
      return { exec: async () => state.loanPageResult };
    }
  };

  let transactionTail = Promise.resolve();
  const startSession = async () => ({
    withTransaction(callback) {
      const operation = transactionTail.then(async () => {
        const snapshot = {
          books: state.books.map((record) => ({ ...record })),
          copies: state.copies.map((record) => ({ ...record })),
          loans: state.loans.map((record) => ({ ...record }))
        };
        try {
          return await callback();
        } catch (error) {
          state.books.splice(0, state.books.length, ...snapshot.books);
          state.copies.splice(0, state.copies.length, ...snapshot.copies);
          state.loans.splice(0, state.loans.length, ...snapshot.loans);
          throw error;
        }
      });
      transactionTail = operation.catch(() => undefined);
      return operation;
    },
    endSession: async () => {}
  });

  const server = new ApolloServer({
    typeDefs,
    resolvers: createResolvers({ Book, User, Copy, Loan }, {
      startSession,
      generateInventoryCode: () => state.forcedInventoryCode || `BIB-TEST-${state.copies.length + 1}`
    })
  });
  return { server, state };
}

async function execute(server, queryText, variables = {}) {
  const response = await server.executeOperation({ query: queryText, variables });
  return response.body.singleResult;
}

function loanVariables(overrides = {}) {
  return {
    input: {
      bookId: ids.book,
      copyId: ids.copy,
      userId: ids.user,
      loanDate: '2026-11-23',
      dueDate: '2026-12-07',
      ...overrides
    }
  };
}

const registerLoanQuery = `mutation Register($input: NewLoanInput!) {
  registerLoan(input: $input) { loanId status copyStatus loanDate dueDate returnDate }
}`;

test('registra el préstamo dentro de una transacción y actualiza el ejemplar', async () => {
  const { server, state } = createHarness();
  await server.start();
  try {
    const result = await execute(server, registerLoanQuery, loanVariables());
    assert.equal(result.errors, undefined);
    assert.equal(state.loans.length, 1);
    assert.equal(state.loans[0].status, 'active');
    assert.equal(state.copies[0].status, 'loaned');
    assert.equal(result.data.registerLoan.copyStatus, 'loaned');
  } finally {
    await server.stop();
  }
});

test('registra un libro con primer ejemplar y conserva la creación sin ejemplares', async () => {
  const { server, state } = createHarness();
  await server.start();
  try {
    const created = await execute(server, `mutation {
      createBookWithFirstCopy(input: { title: "Libro nuevo", author: "Autora nueva", isbn: "9780000000099" }) {
        book { id title }
        copy { id inventoryCode status }
      }
    }`);
    assert.equal(created.errors, undefined);
    const { book, copy } = created.data.createBookWithFirstCopy;
    assert.equal(book.title, 'Libro nuevo');
    assert.equal(copy.status, 'available');
    assert.match(copy.inventoryCode, /^BIB-TEST-/);
    assert.equal(String(state.copies.at(-1).book), book.id);

    const bookCount = state.books.length;
    const copyCount = state.copies.length;
    const withoutCopy = await execute(server, `mutation {
      createBook(input: { title: "Solo catálogo", author: "Autora", isbn: "9780000000100" }) { id title }
    }`);
    assert.equal(withoutCopy.errors, undefined);
    assert.equal(state.books.length, bookCount + 1);
    assert.equal(state.copies.length, copyCount);
  } finally {
    await server.stop();
  }
});

test('revierte el libro si falla la creación transaccional del primer ejemplar', async () => {
  const { server, state } = createHarness();
  const bookCount = state.books.length;
  state.failCopyCreate = true;
  await server.start();
  try {
    const result = await execute(server, `mutation {
      createBookWithFirstCopy(input: { title: "No debe persistir", author: "Autora", isbn: "9780000000101" }) {
        book { id }
        copy { id }
      }
    }`);
    assert.match(result.errors[0].message, /Fallo de creación de ejemplar simulado/);
    assert.equal(state.books.length, bookCount);
    assert.equal(state.copies.length, 1);
  } finally {
    await server.stop();
  }
});

test('registra ejemplares adicionales y evita códigos de inventario duplicados', async () => {
  const { server, state } = createHarness();
  await server.start();
  try {
    const addCopy = `mutation AddCopy($bookId: ID!) {
      addBookCopy(bookId: $bookId) { id inventoryCode status }
    }`;
    const added = await execute(server, addCopy, { bookId: ids.book });
    assert.equal(added.errors, undefined);
    assert.equal(added.data.addBookCopy.status, 'available');
    assert.equal(String(state.copies.at(-1).book), ids.book);

    state.forcedInventoryCode = 'INV-TEST-1';
    const duplicate = await execute(server, addCopy, { bookId: ids.book });
    assert.equal(duplicate.errors[0].extensions.code, 'CONFLICT');
    assert.equal(state.copies.filter((copy) => copy.inventoryCode === 'INV-TEST-1').length, 1);

    state.forcedInventoryCode = 'BIB-CONCURRENT-COLLISION';
    const concurrent = await Promise.all([
      execute(server, addCopy, { bookId: ids.book }),
      execute(server, addCopy, { bookId: ids.book })
    ]);
    assert.equal(concurrent.filter((result) => !result.errors).length, 1);
    assert.equal(concurrent.filter((result) => result.errors?.[0].extensions.code === 'CONFLICT').length, 1);
    assert.equal(state.copies.filter((copy) => copy.inventoryCode === 'BIB-CONCURRENT-COLLISION').length, 1);
  } finally {
    await server.stop();
  }
});

test('consulta códigos y conteos de ejemplares asociados al libro', async () => {
  const { server, state } = createHarness();
  state.copies.push(
    { _id: '507f1f77bcf86cd799439015', book: ids.book, inventoryCode: 'INV-TEST-2', status: 'loaned' },
    { _id: '507f1f77bcf86cd799439016', book: ids.book, inventoryCode: 'INV-TEST-3', status: 'maintenance' }
  );
  await server.start();
  try {
    const result = await execute(server, `query {
      bookCopies(bookId: "${ids.book}") {
        total available loaned maintenance items { inventoryCode status }
      }
    }`);
    assert.equal(result.errors, undefined);
    assert.deepEqual(
      { total: result.data.bookCopies.total, available: result.data.bookCopies.available,
        loaned: result.data.bookCopies.loaned, maintenance: result.data.bookCopies.maintenance },
      { total: 3, available: 1, loaned: 1, maintenance: 1 }
    );
    assert.equal(result.data.bookCopies.items[0].inventoryCode, 'INV-TEST-1');
  } finally {
    await server.stop();
  }
});

test('el ejemplar creado está disponible para préstamo y se libera al devolverlo', async () => {
  const { server, state } = createHarness();
  await server.start();
  try {
    const created = await execute(server, `mutation {
      createBookWithFirstCopy(input: { title: "Préstamo integrado", author: "Autora", isbn: "9780000000102" }) {
        book { id }
        copy { id }
      }
    }`);
    assert.equal(created.errors, undefined);
    const bookId = created.data.createBookWithFirstCopy.book.id;
    const copyId = created.data.createBookWithFirstCopy.copy.id;

    const available = await execute(server, `query { availableCopiesForBook(bookId: "${bookId}") { id inventoryCode } }`);
    assert.equal(available.errors, undefined);
    assert.equal(available.data.availableCopiesForBook[0].id, copyId);

    const loan = await execute(server, registerLoanQuery, loanVariables({ bookId, copyId }));
    assert.equal(loan.errors, undefined);
    const unavailableDuringLoan = await execute(server,
      `query { availableCopiesForBook(bookId: "${bookId}") { id inventoryCode } }`);
    assert.equal(unavailableDuringLoan.data.availableCopiesForBook.length, 0);
    const inventoryDuringLoan = await execute(server, `query {
      bookCopies(bookId: "${bookId}") { available loaned }
    }`);
    assert.equal(inventoryDuringLoan.data.bookCopies.available, 0);
    assert.equal(inventoryDuringLoan.data.bookCopies.loaned, 1);

    const returned = await execute(server,
      'mutation { registerReturn(loanId: "' + loan.data.registerLoan.loanId + '", returnDate: "2026-11-23") { status copyStatus } }');
    assert.equal(returned.errors, undefined);
    assert.equal(returned.data.registerReturn.copyStatus, 'available');
    const availableAgain = await execute(server, `query { availableCopiesForBook(bookId: "${bookId}") { id } }`);
    assert.equal(availableAgain.data.availableCopiesForBook.length, 1);
    assert.equal(String(state.copies.at(-1).book), bookId);
  } finally {
    await server.stop();
  }
});

test('rechaza ejemplares no disponibles y fechas fuera de orden', async () => {
  const { server, state } = createHarness();
  await server.start();
  try {
    state.copies[0].status = 'maintenance';
    const unavailable = await execute(server, registerLoanQuery, loanVariables());
    assert.equal(unavailable.errors[0].extensions.code, 'CONFLICT');
    assert.equal(state.loans.length, 0);

    state.copies[0].status = 'available';
    const invalidDate = await execute(server, registerLoanQuery, loanVariables({ dueDate: '2026-11-23' }));
    assert.equal(invalidDate.errors[0].extensions.code, 'BAD_USER_INPUT');
    assert.equal(state.loans.length, 0);
    assert.equal(state.copies[0].status, 'available');

    state.users.length = 0;
    const missingUser = await execute(server, registerLoanQuery, loanVariables());
    assert.equal(missingUser.errors[0].extensions.code, 'BAD_USER_INPUT');
    assert.equal(state.loans.length, 0);
    assert.equal(state.copies[0].status, 'available');
  } finally {
    await server.stop();
  }
});

test('rechaza préstamos duplicados incluso ante solicitudes simultáneas', async () => {
  const { server, state } = createHarness();
  await server.start();
  try {
    const results = await Promise.all([
      execute(server, registerLoanQuery, loanVariables()),
      execute(server, registerLoanQuery, loanVariables())
    ]);
    assert.equal(results.filter((result) => !result.errors).length, 1);
    assert.equal(results.filter((result) => result.errors?.[0].extensions.code === 'CONFLICT').length, 1);
    assert.equal(state.loans.length, 1);
    assert.equal(state.copies[0].status, 'loaned');
  } finally {
    await server.stop();
  }
});

test('registra la devolución tardía, libera el ejemplar y rechaza duplicados', async () => {
  const { server, state } = createHarness();
  state.copies[0].status = 'loaned';
  state.loans.push({
    _id: '507f1f77bcf86cd799439014',
    user: ids.user,
    copy: ids.copy,
    loanDate: new Date('2026-11-01T00:00:00.000Z'),
    dueDate: new Date('2026-11-10T00:00:00.000Z'),
    returnDate: null,
    status: 'active'
  });
  await server.start();
  try {
    const mutation = 'mutation Return($loanId: ID!, $returnDate: String!) { registerReturn(loanId: $loanId, returnDate: $returnDate) { status copyStatus returnDate } }';
    const returned = await execute(server, mutation, {
      loanId: '507f1f77bcf86cd799439014',
      returnDate: '2026-11-12'
    });
    assert.equal(returned.errors, undefined);
    assert.equal(state.loans[0].status, 'returned');
    assert.equal(state.loans[0].returnDate.toISOString(), '2026-11-12T00:00:00.000Z');
    assert.equal(state.copies[0].status, 'available');
    assert.equal(returned.data.registerReturn.copyStatus, 'available');

    const duplicate = await execute(server, mutation, {
      loanId: '507f1f77bcf86cd799439014',
      returnDate: '2026-11-12'
    });
    assert.equal(duplicate.errors[0].extensions.code, 'CONFLICT');
    assert.equal(state.loans[0].returnDate.toISOString(), '2026-11-12T00:00:00.000Z');
  } finally {
    await server.stop();
  }
});

test('revierte el cambio del ejemplar si falla la creación del préstamo', async () => {
  const { server, state } = createHarness();
  state.failLoanCreate = true;
  await server.start();
  try {
    const result = await execute(server, registerLoanQuery, loanVariables());
    assert.match(result.errors[0].message, /Fallo de inserción simulado/);
    assert.equal(state.loans.length, 0);
    assert.equal(state.copies[0].status, 'available');
  } finally {
    await server.stop();
  }
});

test('revierte la devolución si no puede liberar el ejemplar', async () => {
  const { server, state } = createHarness();
  state.copies[0].status = 'loaned';
  state.failCopyRelease = true;
  state.loans.push({
    _id: '507f1f77bcf86cd799439014',
    user: ids.user,
    copy: ids.copy,
    loanDate: new Date('2026-11-01T00:00:00.000Z'),
    dueDate: new Date('2026-11-10T00:00:00.000Z'),
    returnDate: null,
    status: 'active'
  });
  await server.start();
  try {
    const result = await execute(server,
      'mutation { registerReturn(loanId: "507f1f77bcf86cd799439014", returnDate: "2026-11-12") { status } }');
    assert.equal(result.errors[0].extensions.code, 'CONFLICT');
    assert.equal(state.loans[0].status, 'active');
    assert.equal(state.loans[0].returnDate, null);
    assert.equal(state.copies[0].status, 'loaned');
  } finally {
    await server.stop();
  }
});

test('pagina libros, usuarios y préstamos y aplica filtros en servidor', async () => {
  const { server, state } = createHarness();
  state.books = Array.from({ length: 23 }, (_, index) => ({
    _id: (index + 1).toString(16).padStart(24, '0'),
    title: `Libro ${index + 1}`,
    author: 'Autor',
    isbn: `9780000000${String(index).padStart(3, '0')}`,
    genre: 'Historia'
  }));
  state.users = Array.from({ length: 23 }, (_, index) => ({
    _id: (index + 50).toString(16).padStart(24, '0'),
    fullName: `Persona ${index + 1}`,
    email: `persona${index + 1}@example.com`
  }));
  state.loanPageResult = [{
    items: [{
      loanId: 'loan-1',
      title: 'Libro 2',
      author: 'Autor',
      genre: 'Historia',
      userName: 'Persona 2',
      email: 'persona2@example.com',
      inventoryCode: 'INV-02',
      loanDate: '2026-11-01T00:00:00.000Z',
      dueDate: '2026-11-10T00:00:00.000Z',
      returnDate: null,
      status: 'overdue',
      daysRemaining: 0,
      daysOverdue: 13
    }],
    totals: [{ total: 31 }]
  }];
  state.copyOptions = [{
    id: '507f1f77bcf86cd799439013',
    inventoryCode: 'INV-TEST-1',
    bookId: ids.book,
    title: 'Libro de prueba'
  }];
  await server.start();
  try {
    const books = await execute(server, '{ booksPage(search: "Libro 1", page: 2, pageSize: 10) { total page pageSize totalPages items { title } } }');
    assert.equal(books.errors, undefined);
    assert.equal(books.data.booksPage.total, 11);
    assert.equal(books.data.booksPage.page, 2);
    assert.equal(books.data.booksPage.pageSize, 10);

    const users = await execute(server, '{ usersPage(search: "persona1@", page: 1, pageSize: 10) { total items { email } } }');
    assert.equal(users.errors, undefined);
    assert.equal(users.data.usersPage.total, 1);

    const copies = await execute(server, `{ availableCopiesForBook(bookId: "${ids.book}") { id inventoryCode title } }`);
    assert.equal(copies.errors, undefined);
    assert.equal(copies.data.availableCopiesForBook[0].inventoryCode, 'INV-TEST-1');
    const copyPipeline = state.aggregateCalls.find((call) => call.model === 'Copy').pipeline;
    assert.ok(copyPipeline.some((stage) => stage.$lookup?.from === 'loans'));
    assert.ok(copyPipeline.some((stage) => stage.$addFields?.pendingLoans));

    const loans = await execute(server, '{ loansPage(status: "overdue", search: "Libro", page: 2, pageSize: 25) { total totalPages items { status } } }');
    assert.equal(loans.errors, undefined);
    assert.equal(loans.data.loansPage.total, 31);
    assert.equal(loans.data.loansPage.totalPages, 2);
    const facet = state.aggregateCalls.find((call) => call.model === 'Loan').pipeline.find((stage) => stage.$facet).$facet;
    assert.ok(facet.items.some((stage) => stage.$skip === 25));
    assert.ok(state.aggregateCalls.find((call) => call.model === 'Loan').pipeline.some((stage) => stage.$match?.effectiveStatus === 'overdue'));

    const returns = await execute(server, '{ returnsPage(page: 1, pageSize: 10) { total items { status } } }');
    assert.equal(returns.errors, undefined);
    const returnPipeline = state.aggregateCalls.filter((call) => call.model === 'Loan').at(-1).pipeline;
    assert.ok(returnPipeline.some((stage) => stage.$match?.effectiveStatus?.$in?.includes('returned')));

    const pending = await execute(server, '{ pendingLoansPage(page: 1, pageSize: 10) { total items { status } } }');
    assert.equal(pending.errors, undefined);
    const pendingPipeline = state.aggregateCalls.filter((call) => call.model === 'Loan').at(-1).pipeline;
    assert.ok(pendingPipeline.some((stage) => stage.$match?.effectiveStatus?.$in?.includes('active')));

    const invalidSize = await execute(server, '{ booksPage(page: 1, pageSize: 20) { total } }');
    assert.equal(invalidSize.errors[0].extensions.code, 'BAD_USER_INPUT');
  } finally {
    await server.stop();
  }
});
