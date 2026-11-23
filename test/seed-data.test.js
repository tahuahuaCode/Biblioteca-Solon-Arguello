const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RECORD_COUNT,
  createBooksAndUsers,
  createCopies,
  createLoans
} = require('../src/seed-data');
const { assertEmptyCounts, assertExpectedCounts } = require('../src/seed-safety');

test('genera 1000 libros y usuarios con claves únicas', () => {
  const { books, users } = createBooksAndUsers();

  assert.equal(books.length, RECORD_COUNT);
  assert.equal(users.length, RECORD_COUNT);
  assert.equal(new Set(books.map((book) => book.isbn)).size, RECORD_COUNT);
  assert.equal(new Set(books.map((book) => book.title)).size, RECORD_COUNT);
  assert.equal(new Set(users.map((user) => user.email)).size, RECORD_COUNT);
  assert.ok(books.every((book) => /^\d{13}$/.test(book.isbn)));
  assert.ok(books.every((book) => book.title && book.author && book.genre));
  assert.ok(users.every((user) => user.fullName && user.email.endsWith('@example.test')));
});

test('relaciona ejemplares y préstamos, con estados y fechas coherentes', () => {
  const ids = Array.from({ length: RECORD_COUNT }, (_, index) => ({ _id: `id-${index}` }));
  const copies = createCopies(ids);
  const users = ids.map((_, index) => ({ _id: `user-${index}` }));
  const copyDocuments = copies.map((copy, index) => ({ ...copy, _id: `copy-${index}` }));
  const now = new Date('2026-06-15T12:00:00.000Z');
  const loans = createLoans(users, copyDocuments, now);

  assert.equal(copies.length, RECORD_COUNT);
  assert.equal(loans.length, RECORD_COUNT);
  assert.equal(new Set(copies.map((copy) => copy.inventoryCode)).size, RECORD_COUNT);
  assert.ok(copies.every((copy, index) => copy.book === ids[index]._id));
  assert.ok(copies.every((copy) => ids.some((book) => book._id === copy.book)));
  assert.ok(copies.every((copy, index) => (
    copy.status === ((index >= 500 && index < 800) ? 'available' : 'loaned')
  )));
  const userIds = new Set(users.map((user) => user._id));
  const copyIds = new Set(copyDocuments.map((copy) => copy._id));
  const copiesById = new Map(copyDocuments.map((copy) => [copy._id, copy]));
  assert.ok(loans.every((loan) => userIds.has(loan.user) && copyIds.has(loan.copy)));
  assert.ok(loans.every((loan) => (
    copiesById.get(loan.copy).status === (loan.status === 'returned' ? 'available' : 'loaned')
  )));
  assert.ok(loans.filter((loan) => loan.status === 'active').every((loan) => loan.dueDate > now));
  assert.ok(loans.filter((loan) => loan.status === 'overdue').every((loan) => loan.dueDate < now));

  const statusCounts = loans.reduce((counts, loan) => {
    counts[loan.status] = (counts[loan.status] || 0) + 1;
    return counts;
  }, {});
  assert.deepEqual(statusCounts, { active: 500, returned: 300, overdue: 200 });
  assert.ok(loans.filter((loan) => loan.status === 'returned').every((loan) => loan.returnDate instanceof Date));
  assert.ok(loans.filter((loan) => loan.status !== 'returned').every((loan) => loan.returnDate === null));
});

test('rechaza colecciones con datos y conteos distintos de 1000', () => {
  assert.throws(
    () => assertEmptyCounts({ books: 1, users: 0, copies: 0, loans: 0 }),
    /Carga cancelada/
  );
  assert.doesNotThrow(
    () => assertEmptyCounts({ books: 0, users: 0, copies: 0, loans: 0 })
  );
  assert.doesNotThrow(
    () => assertExpectedCounts({ books: 1000, users: 1000, copies: 1000, loans: 1000 }, 1000)
  );
  assert.throws(
    () => assertExpectedCounts({ books: 1000, users: 999, copies: 1000, loans: 1000 }, 1000),
    /Conteos inesperados/
  );
});
