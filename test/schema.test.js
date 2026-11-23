const test = require('node:test');
const assert = require('node:assert/strict');
const { ApolloServer } = require('@apollo/server');
const { typeDefs, createResolvers } = require('../src/schema');

function createMemoryModel() {
  const records = [];
  let nextId = 1;
  return {
    find: () => ({
      sort: () => ({
        exec: async () => records.slice()
      })
    }),
    findById: (id) => ({
      exec: async () => records.find((record) => record.id === id) || null
    }),
    create: async (input) => {
      const record = { id: (nextId++).toString(16).padStart(24, '0'), ...input };
      records.push(record);
      return record;
    },
    findByIdAndUpdate: (id, input) => ({
      exec: async () => {
        const record = records.find((item) => item.id === id);
        if (!record) return null;
        Object.assign(record, input);
        return record;
      }
    }),
    findByIdAndDelete: (id) => ({
      exec: async () => {
        const index = records.findIndex((item) => item.id === id);
        return index < 0 ? null : records.splice(index, 1)[0];
      }
    })
  };
}

async function createTestServer() {
  const Book = createMemoryModel();
  const User = createMemoryModel();
  Book._records = () => BookData;
  User._records = () => UserData;
  const BookData = [];
  const UserData = [];
  const bookCreate = Book.create;
  const userCreate = User.create;
  Book.create = async (input) => {
    const record = await bookCreate(input);
    BookData.push(record);
    return record;
  };
  User.create = async (input) => {
    const record = await userCreate(input);
    UserData.push(record);
    return record;
  };
  Book.findByIdAndUpdate = (id, input) => ({
    exec: async () => {
      const record = BookData.find((item) => item.id === id);
      if (record) Object.assign(record, input);
      return record || null;
    }
  });
  User.findByIdAndUpdate = (id, input) => ({
    exec: async () => {
      const record = UserData.find((item) => item.id === id);
      if (record) Object.assign(record, input);
      return record || null;
    }
  });
  Book.findByIdAndDelete = (id) => ({
    exec: async () => {
      const index = BookData.findIndex((item) => item.id === id);
      return index < 0 ? null : BookData.splice(index, 1)[0];
    }
  });
  User.findByIdAndDelete = (id) => ({
    exec: async () => {
      const index = UserData.findIndex((item) => item.id === id);
      return index < 0 ? null : UserData.splice(index, 1)[0];
    }
  });
  Book.find = () => ({ sort: () => ({ exec: async () => BookData.slice() }) });
  User.find = () => ({ sort: () => ({ exec: async () => UserData.slice() }) });
  const server = new ApolloServer({ typeDefs, resolvers: createResolvers({ Book, User }) });
  await server.start();
  return server;
}

async function execute(server, query) {
  const response = await server.executeOperation({ query });
  return response.body.singleResult;
}

test('CRUD de libros mediante operaciones GraphQL', async () => {
  const server = await createTestServer();
  try {
    const created = await execute(
      server,
      'mutation { createBook(input: { title: "Dune", author: "Frank Herbert", isbn: "9780441172719" }) { id title } }'
    );
    assert.equal(created.errors, undefined);
    assert.equal(created.data.createBook.title, 'Dune');

    const updated = await execute(
      server,
      `mutation { updateBook(id: "${created.data.createBook.id}", input: { genre: "Ciencia ficción" }) { genre } }`
    );
    assert.equal(updated.data.updateBook.genre, 'Ciencia ficción');

    const listed = await execute(server, '{ books { title } }');
    assert.deepEqual(listed.data.books.map((book) => book.title), ['Dune']);

    const deleted = await execute(
      server,
      `mutation { deleteBook(id: "${created.data.createBook.id}") { id } }`
    );
    assert.equal(deleted.data.deleteBook.id, created.data.createBook.id);
    assert.deepEqual((await execute(server, '{ books { id } }')).data.books, []);
  } finally {
    await server.stop();
  }
});

test('CRUD de usuarios mediante operaciones GraphQL', async () => {
  const server = await createTestServer();
  try {
    const created = await execute(
      server,
      'mutation { createUser(input: { fullName: "Ada Lovelace", email: "ada@example.com" }) { id fullName } }'
    );
    assert.equal(created.errors, undefined);
    assert.equal(created.data.createUser.fullName, 'Ada Lovelace');

    const updated = await execute(
      server,
      `mutation { updateUser(id: "${created.data.createUser.id}", input: { phone: "555-0100" }) { phone } }`
    );
    assert.equal(updated.data.updateUser.phone, '555-0100');
    const listed = await execute(server, '{ users { email } }');
    assert.deepEqual(listed.data.users.map((user) => user.email), ['ada@example.com']);

    const deleted = await execute(
      server,
      `mutation { deleteUser(id: "${created.data.createUser.id}") { id } }`
    );
    assert.equal(deleted.data.deleteUser.id, created.data.createUser.id);
    assert.deepEqual((await execute(server, '{ users { id } }')).data.users, []);
  } finally {
    await server.stop();
  }
});

test('rechaza identificadores inválidos y actualizaciones vacías', async () => {
  const server = await createTestServer();
  try {
    const invalidId = await execute(server, 'mutation { deleteBook(id: "no-es-id") { id } }');
    assert.equal(invalidId.errors[0].extensions.code, 'BAD_USER_INPUT');

    const emptyUpdate = await execute(
      server,
      'mutation { updateUser(id: "507f1f77bcf86cd799439011", input: {}) { id } }'
    );
    assert.equal(emptyUpdate.errors[0].extensions.code, 'BAD_USER_INPUT');
  } finally {
    await server.stop();
  }
});
