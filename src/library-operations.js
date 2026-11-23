const { gql } = require('graphql-tag');
const { GraphQLError } = require('graphql');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const typeDefs = gql`
  type BookPage {
    items: [Book!]!
    total: Int!
    page: Int!
    pageSize: Int!
    totalPages: Int!
  }

  type UserPage {
    items: [User!]!
    total: Int!
    page: Int!
    pageSize: Int!
    totalPages: Int!
  }

  type LibraryLoanPage {
    items: [LibraryLoan!]!
    total: Int!
    page: Int!
    pageSize: Int!
    totalPages: Int!
  }

  type LoanCopyOption {
    id: ID!
    inventoryCode: String!
    bookId: ID!
    title: String!
  }

  type PhysicalCopy {
    id: ID!
    inventoryCode: String!
    status: String!
  }

  type BookCopyInventory {
    items: [PhysicalCopy!]!
    total: Int!
    available: Int!
    loaned: Int!
    maintenance: Int!
  }

  type BookWithFirstCopy {
    book: Book!
    copy: PhysicalCopy!
  }

  type LoanActionResult {
    loanId: ID!
    status: String!
    copyStatus: String!
    loanDate: String!
    dueDate: String!
    returnDate: String
  }

  input NewLoanInput {
    bookId: ID!
    copyId: ID!
    userId: ID!
    loanDate: String!
    dueDate: String!
  }

  extend type Query {
    booksPage(search: String, genre: String, page: Int = 1, pageSize: Int = 10): BookPage!
    usersPage(search: String, page: Int = 1, pageSize: Int = 10): UserPage!
    availableCopiesForBook(bookId: ID!): [LoanCopyOption!]!
    bookCopies(bookId: ID!): BookCopyInventory!
    loansPage(status: String, search: String, page: Int = 1, pageSize: Int = 10): LibraryLoanPage!
    returnsPage(status: String, search: String, page: Int = 1, pageSize: Int = 10): LibraryLoanPage!
    pendingLoansPage(search: String, page: Int = 1, pageSize: Int = 10): LibraryLoanPage!
  }

  extend type Mutation {
    createBookWithFirstCopy(input: BookInput!): BookWithFirstCopy!
    addBookCopy(bookId: ID!): PhysicalCopy!
    registerLoan(input: NewLoanInput!): LoanActionResult!
    registerReturn(loanId: ID!, returnDate: String!): LoanActionResult!
  }
`;

const PAGE_SIZES = new Set([10, 25, 50]);
const PENDING_STATUSES = ['active', 'overdue'];
const LOAN_STATUSES = ['active', 'overdue', 'returned'];

function badInput(message) {
  return new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

function conflict(message) {
  return new GraphQLError(message, { extensions: { code: 'CONFLICT' } });
}

function duplicateInventoryCode(error) {
  return error?.code === 11000
    && (error.keyPattern?.inventoryCode || error.keyValue?.inventoryCode || error.message?.includes('inventoryCode'));
}

function inventoryCode() {
  return `BIB-${randomUUID().toUpperCase()}`;
}

async function insertCopy(models, bookId, session, generateInventoryCode) {
  try {
    const options = session ? { session } : undefined;
    const [copy] = await models.Copy.create(
      [{ book: bookId, inventoryCode: generateInventoryCode(), status: 'available' }],
      options
    );
    return copy;
  } catch (error) {
    if (duplicateInventoryCode(error)) {
      throw conflict('El código de inventario ya existe. Vuelve a intentarlo para generar otro código.');
    }
    throw error;
  }
}

function validateId(id, label) {
  if (!mongoose.isValidObjectId(id)) throw badInput(`El identificador de ${label} no es válido.`);
}

function pagination(page, pageSize) {
  if (!Number.isInteger(page) || page < 1) throw badInput('La página debe ser un entero mayor que cero.');
  if (!PAGE_SIZES.has(pageSize)) throw badInput('El tamaño de página debe ser 10, 25 o 50.');
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function searchRegex(search) {
  if (search == null || search.trim() === '') return null;
  const term = search.trim();
  if (term.length > 100) throw badInput('La búsqueda no puede superar 100 caracteres.');
  return new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function dateOnly(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw badInput(`${label} debe tener el formato AAAA-MM-DD.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw badInput(`${label} no es una fecha válida.`);
  }
  return date;
}

function sameOrAfterDay(first, second) {
  return first.toISOString().slice(0, 10) >= second.toISOString().slice(0, 10);
}

function formatDate(value) {
  return value ? new Date(value).toISOString() : null;
}

function pageResult(items, total, page, pageSize) {
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

function bookFilter(search, genre) {
  const filter = {};
  const regex = searchRegex(search);
  if (regex) filter.$or = ['title', 'author', 'genre', 'isbn'].map((field) => ({ [field]: regex }));
  if (genre) filter.genre = genre;
  return filter;
}

function userFilter(search) {
  const regex = searchRegex(search);
  return regex ? { $or: [{ fullName: regex }, { email: regex }] } : {};
}

function loanStages(models, { status, search, pendingOnly = false, returnOnly = false }) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const todayStart = new Date(`${today}T00:00:00.000Z`);
  const regex = searchRegex(search);
  const dueBeforeToday = {
    $lt: [
      { $dateToString: { date: '$dueDate', format: '%Y-%m-%d', timezone: 'UTC' } },
      today
    ]
  };
  const dueTodayOrLater = {
    $gte: [
      { $dateToString: { date: '$dueDate', format: '%Y-%m-%d', timezone: 'UTC' } },
      today
    ]
  };
  const stages = [
    { $lookup: { from: models.User.collection.name, localField: 'user', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $lookup: { from: models.Copy.collection.name, localField: 'copy', foreignField: '_id', as: 'copy' } },
    { $unwind: '$copy' },
    { $lookup: { from: models.Book.collection.name, localField: 'copy.book', foreignField: '_id', as: 'book' } },
    { $unwind: '$book' },
    {
      $addFields: {
        effectiveStatus: {
          $cond: [
            { $eq: ['$status', 'returned'] },
            'returned',
            { $cond: [dueBeforeToday, 'overdue', 'active'] }
          ]
        },
        daysRemaining: {
          $cond: [
            { $and: [{ $ne: ['$status', 'returned'] }, dueTodayOrLater] },
            { $dateDiff: { startDate: todayStart, endDate: '$dueDate', unit: 'day' } },
            0
          ]
        },
        daysOverdue: {
          $cond: [
            { $eq: ['$status', 'returned'] },
            {
              $cond: [
                {
                  $gt: [
                    { $dateToString: { date: '$returnDate', format: '%Y-%m-%d', timezone: 'UTC' } },
                    { $dateToString: { date: '$dueDate', format: '%Y-%m-%d', timezone: 'UTC' } }
                  ]
                },
                { $dateDiff: { startDate: '$dueDate', endDate: '$returnDate', unit: 'day' } },
                0
              ]
            },
            {
              $cond: [
                dueBeforeToday,
                { $dateDiff: { startDate: '$dueDate', endDate: todayStart, unit: 'day' } },
                0
              ]
            }
          ]
        }
      }
    }
  ];

  if (pendingOnly) stages.push({ $match: { effectiveStatus: { $in: PENDING_STATUSES } } });
  else if (returnOnly) stages.push({ $match: { effectiveStatus: { $in: ['overdue', 'returned'] } } });
  else if (status) stages.push({ $match: { effectiveStatus: status } });
  if (regex) {
    stages.push({
      $match: {
        $or: [
          { 'book.title': regex },
          { 'book.author': regex },
          { 'user.fullName': regex },
          { 'user.email': regex },
          { 'copy.inventoryCode': regex }
        ]
      }
    });
  }
  return stages;
}

function loanProjection() {
  return {
    $project: {
      _id: 0,
      loanId: { $toString: '$_id' },
      title: '$book.title',
      author: '$book.author',
      genre: { $ifNull: ['$book.genre', 'Sin género'] },
      userName: '$user.fullName',
      email: '$user.email',
      inventoryCode: '$copy.inventoryCode',
      loanDate: { $dateToString: { date: '$loanDate', format: '%Y-%m-%dT%H:%M:%S.%LZ', timezone: 'UTC' } },
      dueDate: { $dateToString: { date: '$dueDate', format: '%Y-%m-%dT%H:%M:%S.%LZ', timezone: 'UTC' } },
      returnDate: {
        $dateToString: {
          date: '$returnDate',
          format: '%Y-%m-%dT%H:%M:%S.%LZ',
          timezone: 'UTC',
          onNull: null
        }
      },
      status: '$effectiveStatus',
      daysRemaining: 1,
      daysOverdue: 1
    }
  };
}

async function pagedLoans(models, filters, page, pageSize) {
  const stages = loanStages(models, filters);
  const offset = (page - 1) * pageSize;
  const [result = { items: [], totals: [] }] = await models.Loan.aggregate([
    ...stages,
    {
      $facet: {
        items: [
          { $sort: { loanDate: -1, _id: 1 } },
          { $skip: offset },
          { $limit: pageSize },
          loanProjection()
        ],
        totals: [{ $count: 'total' }]
      }
    }
  ]).exec();
  return pageResult(result.items || [], result.totals[0]?.total || 0, page, pageSize);
}

function executeInSession(query, session) {
  return query.session(session).exec();
}

async function withTransaction(startSession, callback) {
  const session = await startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

function actionResult(loan, copyStatus) {
  return {
    loanId: loan._id.toString(),
    status: loan.status,
    copyStatus,
    loanDate: formatDate(loan.loanDate),
    dueDate: formatDate(loan.dueDate),
    returnDate: formatDate(loan.returnDate)
  };
}

function createLibraryResolvers(models, {
  startSession = () => mongoose.startSession(),
  generateInventoryCode = inventoryCode
} = {}) {
  return {
    Query: {
      booksPage: async (_, { search, genre, page, pageSize }) => {
        const paging = pagination(page, pageSize);
        const filter = bookFilter(search, genre);
        const [total, items] = await Promise.all([
          models.Book.countDocuments(filter).exec(),
          models.Book.find(filter).sort({ title: 1, _id: 1 }).skip(paging.skip).limit(pageSize).exec()
        ]);
        return pageResult(items, total, page, pageSize);
      },

      usersPage: async (_, { search, page, pageSize }) => {
        const paging = pagination(page, pageSize);
        const filter = userFilter(search);
        const [total, items] = await Promise.all([
          models.User.countDocuments(filter).exec(),
          models.User.find(filter).sort({ fullName: 1, _id: 1 }).skip(paging.skip).limit(pageSize).exec()
        ]);
        return pageResult(items, total, page, pageSize);
      },

      availableCopiesForBook: async (_, { bookId }) => {
        validateId(bookId, 'libro');
        return models.Copy.aggregate([
          { $match: { book: new mongoose.Types.ObjectId(bookId), status: 'available' } },
          { $lookup: { from: models.Loan.collection.name, localField: '_id', foreignField: 'copy', as: 'loans' } },
          {
            $addFields: {
              pendingLoans: {
                $filter: {
                  input: '$loans',
                  as: 'loan',
                  cond: { $in: ['$$loan.status', PENDING_STATUSES] }
                }
              }
            }
          },
          { $match: { pendingLoans: { $size: 0 } } },
          { $lookup: { from: models.Book.collection.name, localField: 'book', foreignField: '_id', as: 'bookInfo' } },
          { $unwind: '$bookInfo' },
          { $sort: { inventoryCode: 1 } },
          {
            $project: {
              _id: 0,
              id: { $toString: '$_id' },
              inventoryCode: 1,
              bookId: { $toString: '$book' },
              title: '$bookInfo.title'
            }
          }
        ]).exec();
      },

      bookCopies: async (_, { bookId }) => {
        validateId(bookId, 'libro');
        const book = await models.Book.findById(bookId).exec();
        if (!book) throw badInput('El libro seleccionado ya no existe.');
        const [result = { items: [], summary: [] }] = await models.Copy.aggregate([
          { $match: { book: new mongoose.Types.ObjectId(bookId) } },
          {
            $facet: {
              items: [
                { $sort: { inventoryCode: 1, _id: 1 } },
                {
                  $project: {
                    _id: 0,
                    id: { $toString: '$_id' },
                    inventoryCode: 1,
                    status: 1
                  }
                }
              ],
              summary: [
                {
                  $group: {
                    _id: null,
                    total: { $sum: 1 },
                    available: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
                    loaned: { $sum: { $cond: [{ $eq: ['$status', 'loaned'] }, 1, 0] } },
                    maintenance: { $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] } }
                  }
                }
              ]
            }
          }
        ]).exec();
        const summary = result.summary[0] || { total: 0, available: 0, loaned: 0, maintenance: 0 };
        return { items: result.items, ...summary };
      },

      loansPage: async (_, { status, search, page, pageSize }) => {
        if (status && !LOAN_STATUSES.includes(status)) throw badInput('El filtro de estado no es válido.');
        const paging = pagination(page, pageSize);
        return pagedLoans(models, { status, search }, page, paging.pageSize);
      },

      returnsPage: async (_, { status, search, page, pageSize }) => {
        if (status && !['overdue', 'returned'].includes(status)) {
          throw badInput('El filtro debe ser vencido o devuelto.');
        }
        const paging = pagination(page, pageSize);
        return pagedLoans(models, { status: status || undefined, search, returnOnly: true }, page, paging.pageSize);
      },

      pendingLoansPage: async (_, { search, page, pageSize }) => {
        const paging = pagination(page, pageSize);
        return pagedLoans(models, { search, pendingOnly: true }, page, paging.pageSize);
      }
    },

    Mutation: {
      createBookWithFirstCopy: async (_, { input }) => withTransaction(startSession, async (session) => {
        const [book] = await models.Book.create([input], { session });
        const copy = await insertCopy(models, book._id, session, generateInventoryCode);
        return { book, copy };
      }),

      addBookCopy: async (_, { bookId }) => {
        validateId(bookId, 'libro');
        const book = await models.Book.findById(bookId).exec();
        if (!book) throw badInput('El libro seleccionado ya no existe.');
        return insertCopy(models, book._id, undefined, generateInventoryCode);
      },

      registerLoan: async (_, { input }) => {
        validateId(input.bookId, 'libro');
        validateId(input.copyId, 'ejemplar');
        validateId(input.userId, 'usuario');
        const loanDate = dateOnly(input.loanDate, 'La fecha del préstamo');
        const dueDate = dateOnly(input.dueDate, 'La fecha límite');
        if (dueDate <= loanDate) throw badInput('La fecha límite debe ser posterior a la fecha del préstamo.');
        const dueDateIsPast = input.dueDate < new Date().toISOString().slice(0, 10);

        return withTransaction(startSession, async (session) => {
          const [book, user, copy] = await Promise.all([
            executeInSession(models.Book.findById(input.bookId), session),
            executeInSession(models.User.findById(input.userId), session),
            executeInSession(models.Copy.findOne({ _id: input.copyId, book: input.bookId }), session)
          ]);
          if (!book) throw badInput('El libro seleccionado ya no existe.');
          if (!user) throw badInput('El usuario seleccionado ya no existe.');
          if (!copy) throw badInput('El ejemplar no pertenece al libro seleccionado o ya no existe.');

          const pendingCount = await executeInSession(
            models.Loan.countDocuments({ copy: input.copyId, status: { $in: PENDING_STATUSES } }),
            session
          );
          if (pendingCount > 0) throw conflict('El ejemplar ya tiene un préstamo pendiente; no se modificó ningún registro.');
          if (copy.status !== 'available') {
            throw conflict('El ejemplar no está disponible. Si sus datos parecen inconsistentes, requiere revisión manual.');
          }

          const claimedCopy = await models.Copy.findOneAndUpdate(
            { _id: input.copyId, book: input.bookId, status: 'available' },
            { $set: { status: 'loaned' } },
            { new: true, runValidators: true, session }
          ).exec();
          if (!claimedCopy) throw conflict('El ejemplar dejó de estar disponible; actualiza la lista e inténtalo de nuevo.');

          const [loan] = await models.Loan.create(
            [{
              user: input.userId,
              copy: input.copyId,
              loanDate,
              dueDate,
              returnDate: null,
              status: dueDateIsPast ? 'overdue' : 'active'
            }],
            { session }
          );
          return actionResult(loan, 'loaned');
        });
      },

      registerReturn: async (_, { loanId, returnDate: inputReturnDate }) => {
        validateId(loanId, 'préstamo');
        const returnDate = dateOnly(inputReturnDate, 'La fecha de devolución');
        const today = new Date().toISOString().slice(0, 10);
        if (inputReturnDate > today) throw badInput('La fecha de devolución no puede ser futura.');

        return withTransaction(startSession, async (session) => {
          const loan = await executeInSession(models.Loan.findById(loanId), session);
          if (!loan) throw badInput('El préstamo seleccionado ya no existe.');
          if (loan.status === 'returned') throw conflict('Este préstamo ya fue devuelto.');
          if (!PENDING_STATUSES.includes(loan.status)) throw conflict('El préstamo no está pendiente y no se puede devolver.');
          if (!sameOrAfterDay(returnDate, loan.loanDate)) {
            throw badInput('La fecha de devolución no puede ser anterior a la fecha del préstamo.');
          }

          const [copy, pendingCount] = await Promise.all([
            executeInSession(models.Copy.findById(loan.copy), session),
            executeInSession(
              models.Loan.countDocuments({ copy: loan.copy, status: { $in: PENDING_STATUSES } }),
              session
            )
          ]);
          if (!copy) throw conflict('No se encontró el ejemplar asociado; requiere revisión manual.');
          if (copy.status !== 'loaned' || pendingCount !== 1) {
            throw conflict('El préstamo y el estado del ejemplar no coinciden; no se modificó ningún registro.');
          }

          const updatedLoan = await models.Loan.findOneAndUpdate(
            { _id: loanId, status: { $in: PENDING_STATUSES } },
            { $set: { status: 'returned', returnDate } },
            { new: true, runValidators: true, session }
          ).exec();
          if (!updatedLoan) throw conflict('El préstamo cambió mientras se procesaba; actualiza la lista.');

          const releasedCopy = await models.Copy.findOneAndUpdate(
            { _id: loan.copy, status: 'loaned' },
            { $set: { status: 'available' } },
            { new: true, runValidators: true, session }
          ).exec();
          if (!releasedCopy) throw conflict('El estado del ejemplar cambió; la devolución fue cancelada.');
          return actionResult(updatedLoan, 'available');
        });
      }
    }
  };
}

module.exports = { typeDefs, createLibraryResolvers };
