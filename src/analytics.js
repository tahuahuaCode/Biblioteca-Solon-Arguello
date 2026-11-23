const { gql } = require('graphql-tag');
const { GraphQLError } = require('graphql');

const typeDefs = gql`
  type BooksByGenre {
    genre: String!
    bookCount: Int!
  }

  type BooksByAuthor {
    author: String!
    bookCount: Int!
    genres: [String!]!
  }

  type BooksByDecade {
    decade: Int!
    bookCount: Int!
  }

  type InventoryByGenre {
    genre: String!
    bookCount: Int!
    totalCopies: Int!
    availableCopies: Int!
    loanedCopies: Int!
    maintenanceCopies: Int!
  }

  type AvailableCopy {
    copyId: ID!
    inventoryCode: String!
    status: String!
    bookId: ID!
    title: String!
    author: String!
    isbn: String!
    genre: String!
  }

  type BookWithoutCopies {
    bookId: ID!
    title: String!
    author: String!
    isbn: String!
    genre: String!
  }

  type PopularBook {
    bookId: ID!
    title: String!
    author: String!
    totalLoans: Int!
    activeLoans: Int!
    overdueLoans: Int!
  }

  type CopyStatusSummary {
    status: String!
    copyCount: Int!
  }

  type CatalogStatistics {
    totalBooks: Int!
    averagePublicationYear: Float
    earliestPublicationYear: Int
    latestPublicationYear: Int
    distinctGenres: Int!
  }

  type BookInventory {
    bookId: ID!
    title: String!
    author: String!
    genre: String!
    totalCopies: Int!
    availableCopies: Int!
  }

  type LoanStatusCount {
    status: String!
    loanCount: Int!
  }

  type OverdueLoan {
    loanId: ID!
    userId: ID!
    userName: String!
    email: String!
    copyId: ID!
    inventoryCode: String!
    bookId: ID!
    title: String!
    author: String!
    loanDate: String!
    dueDate: String!
    daysOverdue: Int!
  }

  type BorrowerActivity {
    userId: ID!
    fullName: String!
    email: String!
    totalLoans: Int!
    activeLoans: Int!
    overdueLoans: Int!
    returnedLoans: Int!
  }

  type MonthlyReturns {
    year: Int!
    month: Int!
    returnCount: Int!
  }

  type OverdueStatistics {
    overdueLoans: Int!
    averageDaysOverdue: Float!
    maxDaysOverdue: Int!
  }

  type ActiveLoansByUser {
    userId: ID!
    fullName: String!
    email: String!
    activeLoans: Int!
  }

  type LoansByGenre {
    genre: String!
    totalLoans: Int!
    activeLoans: Int!
    returnedLoans: Int!
    overdueLoans: Int!
  }

  type MonthlyLoanCount {
    year: Int!
    month: Int!
    loanCount: Int!
  }

  type UserWithoutLoans {
    userId: ID!
    fullName: String!
    email: String!
  }

  type ReturnTimeliness {
    totalReturned: Int!
    onTimeReturns: Int!
    lateReturns: Int!
    averageLoanDays: Float!
  }

  extend type Query {
    esauBooksByGenre: [BooksByGenre!]!
    esauBooksByAuthor(limit: Int = 20): [BooksByAuthor!]!
    esauBooksByDecade: [BooksByDecade!]!
    esauInventoryByGenre: [InventoryByGenre!]!
    esauAvailableCopies(genre: String, limit: Int = 100): [AvailableCopy!]!
    esauBooksWithoutCopies(limit: Int = 100): [BookWithoutCopies!]!
    esauMostLoanedBooks(limit: Int = 20): [PopularBook!]!
    esauCopyStatusSummary: [CopyStatusSummary!]!
    esauCatalogStatistics: CatalogStatistics!
    esauBooksByInventory(maxCopies: Int = 1, limit: Int = 100): [BookInventory!]!

    miguelLoansByStatus: [LoanStatusCount!]!
    miguelOverdueLoans(limit: Int = 50): [OverdueLoan!]!
    miguelMostActiveBorrowers(limit: Int = 20): [BorrowerActivity!]!
    miguelReturnsByMonth: [MonthlyReturns!]!
    miguelOverdueStatistics: OverdueStatistics!
    miguelActiveLoansByUser(limit: Int = 100): [ActiveLoansByUser!]!
    miguelLoansByGenre: [LoansByGenre!]!
    miguelLoansByMonth: [MonthlyLoanCount!]!
    miguelUsersWithoutLoans(limit: Int = 100): [UserWithoutLoans!]!
    miguelReturnTimeliness: ReturnTimeliness!
  }
`;

function boundedInteger(value, name, maximum) {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new GraphQLError(`${name} debe estar entre 1 y ${maximum}.`, {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }
  return value;
}

function dateToString(field) {
  return { $dateToString: { date: field, format: '%Y-%m-%dT%H:%M:%S.%LZ', timezone: 'UTC' } };
}

function activeOverdueMatch(now) {
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return {
    status: { $in: ['active', 'overdue'] },
    dueDate: { $lt: todayStart }
  };
}

function createAnalyticsResolvers(models) {
  const aggregate = (model, pipeline) => model.aggregate(pipeline).exec();

  return {
    Query: {
      esauBooksByGenre: () => aggregate(models.Book, [
        { $group: { _id: { $ifNull: ['$genre', 'Sin género'] }, bookCount: { $sum: 1 } } },
        { $project: { _id: 0, genre: '$_id', bookCount: 1 } },
        { $sort: { bookCount: -1, genre: 1 } }
      ]),

      esauBooksByAuthor: (_, { limit }) => aggregate(models.Book, [
        {
          $group: {
            _id: '$author',
            bookCount: { $sum: 1 },
            genres: { $addToSet: { $ifNull: ['$genre', 'Sin género'] } }
          }
        },
        { $project: { _id: 0, author: '$_id', bookCount: 1, genres: 1 } },
        { $sort: { bookCount: -1, author: 1 } },
        { $limit: boundedInteger(limit, 'limit', 100) }
      ]),

      esauBooksByDecade: () => aggregate(models.Book, [
        { $match: { publishedYear: { $type: 'number' } } },
        {
          $group: {
            _id: { $subtract: ['$publishedYear', { $mod: ['$publishedYear', 10] }] },
            bookCount: { $sum: 1 }
          }
        },
        { $project: { _id: 0, decade: '$_id', bookCount: 1 } },
        { $sort: { decade: 1 } }
      ]),

      esauInventoryByGenre: () => aggregate(models.Book, [
        { $lookup: { from: 'copies', localField: '_id', foreignField: 'book', as: 'copies' } },
        { $unwind: { path: '$copies', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ['$genre', 'Sin género'] },
            books: { $addToSet: '$_id' },
            totalCopies: { $sum: { $cond: [{ $ne: ['$copies._id', null] }, 1, 0] } },
            availableCopies: {
              $sum: { $cond: [{ $eq: ['$copies.status', 'available'] }, 1, 0] }
            },
            loanedCopies: { $sum: { $cond: [{ $eq: ['$copies.status', 'loaned'] }, 1, 0] } },
            maintenanceCopies: {
              $sum: { $cond: [{ $eq: ['$copies.status', 'maintenance'] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            _id: 0,
            genre: '$_id',
            bookCount: { $size: '$books' },
            totalCopies: 1,
            availableCopies: 1,
            loanedCopies: 1,
            maintenanceCopies: 1
          }
        },
        { $sort: { genre: 1 } }
      ]),

      esauAvailableCopies: (_, { genre, limit }) => {
        const pipeline = [
          { $match: { status: 'available' } },
          { $lookup: { from: 'books', localField: 'book', foreignField: '_id', as: 'book' } },
          { $unwind: '$book' }
        ];
        if (genre) pipeline.push({ $match: { 'book.genre': genre } });
        pipeline.push(
          {
            $project: {
              _id: 0,
              copyId: { $toString: '$_id' },
              inventoryCode: 1,
              status: 1,
              bookId: { $toString: '$book._id' },
              title: '$book.title',
              author: '$book.author',
              isbn: '$book.isbn',
              genre: { $ifNull: ['$book.genre', 'Sin género'] }
            }
          },
          { $sort: { inventoryCode: 1 } },
          { $limit: boundedInteger(limit, 'limit', 500) }
        );
        return aggregate(models.Copy, pipeline);
      },

      esauBooksWithoutCopies: (_, { limit }) => aggregate(models.Book, [
        { $lookup: { from: 'copies', localField: '_id', foreignField: 'book', as: 'copies' } },
        { $match: { copies: { $size: 0 } } },
        {
          $project: {
            _id: 0,
            bookId: { $toString: '$_id' },
            title: 1,
            author: 1,
            isbn: 1,
            genre: { $ifNull: ['$genre', 'Sin género'] }
          }
        },
        { $sort: { title: 1 } },
        { $limit: boundedInteger(limit, 'limit', 500) }
      ]),

      esauMostLoanedBooks: (_, { limit }) => aggregate(models.Loan, [
        { $lookup: { from: 'copies', localField: 'copy', foreignField: '_id', as: 'copy' } },
        { $unwind: '$copy' },
        { $lookup: { from: 'books', localField: 'copy.book', foreignField: '_id', as: 'book' } },
        { $unwind: '$book' },
        {
          $group: {
            _id: '$book._id',
            title: { $first: '$book.title' },
            author: { $first: '$book.author' },
            totalLoans: { $sum: 1 },
            activeLoans: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            overdueLoans: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } }
          }
        },
        {
          $project: {
            _id: 0,
            bookId: { $toString: '$_id' },
            title: 1,
            author: 1,
            totalLoans: 1,
            activeLoans: 1,
            overdueLoans: 1
          }
        },
        { $sort: { totalLoans: -1, title: 1 } },
        { $limit: boundedInteger(limit, 'limit', 100) }
      ]),

      esauCopyStatusSummary: () => aggregate(models.Copy, [
        { $group: { _id: '$status', copyCount: { $sum: 1 } } },
        { $project: { _id: 0, status: '$_id', copyCount: 1 } },
        { $sort: { status: 1 } }
      ]),

      esauCatalogStatistics: async () => {
        const [statistics] = await aggregate(models.Book, [
          {
            $group: {
              _id: null,
              totalBooks: { $sum: 1 },
              averagePublicationYear: { $avg: '$publishedYear' },
              earliestPublicationYear: { $min: '$publishedYear' },
              latestPublicationYear: { $max: '$publishedYear' },
              genres: { $addToSet: { $ifNull: ['$genre', 'Sin género'] } }
            }
          },
          {
            $project: {
              _id: 0,
              totalBooks: 1,
              averagePublicationYear: 1,
              earliestPublicationYear: 1,
              latestPublicationYear: 1,
              distinctGenres: { $size: '$genres' }
            }
          }
        ]);
        return statistics || {
          totalBooks: 0,
          averagePublicationYear: null,
          earliestPublicationYear: null,
          latestPublicationYear: null,
          distinctGenres: 0
        };
      },

      esauBooksByInventory: (_, { maxCopies, limit }) => {
        if (!Number.isInteger(maxCopies) || maxCopies < 0 || maxCopies > 1000) {
          throw new GraphQLError('maxCopies debe estar entre 0 y 1000.', {
            extensions: { code: 'BAD_USER_INPUT' }
          });
        }
        return aggregate(models.Book, [
          { $lookup: { from: 'copies', localField: '_id', foreignField: 'book', as: 'copies' } },
          {
            $project: {
              title: 1,
              author: 1,
              genre: { $ifNull: ['$genre', 'Sin género'] },
              totalCopies: { $size: '$copies' },
              availableCopies: {
                $size: {
                  $filter: {
                    input: '$copies',
                    as: 'copy',
                    cond: { $eq: ['$$copy.status', 'available'] }
                  }
                }
              }
            }
          },
          { $match: { totalCopies: { $lte: maxCopies } } },
          {
            $project: {
              _id: 0,
              bookId: { $toString: '$_id' },
              title: 1,
              author: 1,
              genre: 1,
              totalCopies: 1,
              availableCopies: 1
            }
          },
          { $sort: { totalCopies: 1, title: 1 } },
          { $limit: boundedInteger(limit, 'limit', 500) }
        ]);
      },

      miguelLoansByStatus: () => aggregate(models.Loan, [
        { $group: { _id: '$status', loanCount: { $sum: 1 } } },
        { $project: { _id: 0, status: '$_id', loanCount: 1 } },
        { $sort: { status: 1 } }
      ]),

      miguelOverdueLoans: (_, { limit }) => {
        const now = new Date();
        return aggregate(models.Loan, [
          { $match: activeOverdueMatch(now) },
          { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
          { $unwind: '$user' },
          { $lookup: { from: 'copies', localField: 'copy', foreignField: '_id', as: 'copy' } },
          { $unwind: '$copy' },
          { $lookup: { from: 'books', localField: 'copy.book', foreignField: '_id', as: 'book' } },
          { $unwind: '$book' },
          {
            $project: {
              _id: 0,
              loanId: { $toString: '$_id' },
              userId: { $toString: '$user._id' },
              userName: '$user.fullName',
              email: '$user.email',
              copyId: { $toString: '$copy._id' },
              inventoryCode: '$copy.inventoryCode',
              bookId: { $toString: '$book._id' },
              title: '$book.title',
              author: '$book.author',
              loanDate: dateToString('$loanDate'),
              dueDate: dateToString('$dueDate'),
              daysOverdue: {
                $floor: { $divide: [{ $subtract: [now, '$dueDate'] }, 86400000] }
              }
            }
          },
          { $sort: { daysOverdue: -1, dueDate: 1 } },
          { $limit: boundedInteger(limit, 'limit', 500) }
        ]);
      },

      miguelMostActiveBorrowers: (_, { limit }) => aggregate(models.Loan, [
        {
          $group: {
            _id: '$user',
            totalLoans: { $sum: 1 },
            activeLoans: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            overdueLoans: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
            returnedLoans: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } }
          }
        },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: { $toString: '$user._id' },
            fullName: '$user.fullName',
            email: '$user.email',
            totalLoans: 1,
            activeLoans: 1,
            overdueLoans: 1,
            returnedLoans: 1
          }
        },
        { $sort: { totalLoans: -1, fullName: 1 } },
        { $limit: boundedInteger(limit, 'limit', 100) }
      ]),

      miguelReturnsByMonth: () => aggregate(models.Loan, [
        { $match: { status: 'returned', returnDate: { $type: 'date' } } },
        {
          $group: {
            _id: {
              year: { $year: { date: '$returnDate', timezone: 'UTC' } },
              month: { $month: { date: '$returnDate', timezone: 'UTC' } }
            },
            returnCount: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            year: '$_id.year',
            month: '$_id.month',
            returnCount: 1
          }
        },
        { $sort: { year: 1, month: 1 } }
      ]),

      miguelOverdueStatistics: async () => {
        const now = new Date();
        const [statistics] = await aggregate(models.Loan, [
          { $match: activeOverdueMatch(now) },
          {
            $group: {
              _id: null,
              overdueLoans: { $sum: 1 },
              averageDaysOverdue: {
                $avg: { $floor: { $divide: [{ $subtract: [now, '$dueDate'] }, 86400000] } }
              },
              maxDaysOverdue: {
                $max: { $floor: { $divide: [{ $subtract: [now, '$dueDate'] }, 86400000] } }
              }
            }
          },
          { $project: { _id: 0, overdueLoans: 1, averageDaysOverdue: 1, maxDaysOverdue: 1 } }
        ]);
        return statistics || { overdueLoans: 0, averageDaysOverdue: 0, maxDaysOverdue: 0 };
      },

      miguelActiveLoansByUser: (_, { limit }) => {
        const now = new Date();
        const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        return aggregate(models.Loan, [
        { $match: { status: { $in: ['active', 'overdue'] }, dueDate: { $gte: todayStart } } },
        { $group: { _id: '$user', activeLoans: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: { $toString: '$user._id' },
            fullName: '$user.fullName',
            email: '$user.email',
            activeLoans: 1
          }
        },
        { $sort: { activeLoans: -1, fullName: 1 } },
        { $limit: boundedInteger(limit, 'limit', 500) }
      ]);
      },

      miguelLoansByGenre: () => aggregate(models.Loan, [
        { $lookup: { from: 'copies', localField: 'copy', foreignField: '_id', as: 'copy' } },
        { $unwind: '$copy' },
        { $lookup: { from: 'books', localField: 'copy.book', foreignField: '_id', as: 'book' } },
        { $unwind: '$book' },
        {
          $group: {
            _id: { $ifNull: ['$book.genre', 'Sin género'] },
            totalLoans: { $sum: 1 },
            activeLoans: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            returnedLoans: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } },
            overdueLoans: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } }
          }
        },
        {
          $project: {
            _id: 0,
            genre: '$_id',
            totalLoans: 1,
            activeLoans: 1,
            returnedLoans: 1,
            overdueLoans: 1
          }
        },
        { $sort: { totalLoans: -1, genre: 1 } }
      ]),

      miguelLoansByMonth: () => aggregate(models.Loan, [
        { $match: { loanDate: { $type: 'date' } } },
        {
          $group: {
            _id: {
              year: { $year: { date: '$loanDate', timezone: 'UTC' } },
              month: { $month: { date: '$loanDate', timezone: 'UTC' } }
            },
            loanCount: { $sum: 1 }
          }
        },
        { $project: { _id: 0, year: '$_id.year', month: '$_id.month', loanCount: 1 } },
        { $sort: { year: 1, month: 1 } }
      ]),

      miguelUsersWithoutLoans: (_, { limit }) => aggregate(models.User, [
        { $lookup: { from: 'loans', localField: '_id', foreignField: 'user', as: 'loans' } },
        { $match: { loans: { $size: 0 } } },
        {
          $project: {
            _id: 0,
            userId: { $toString: '$_id' },
            fullName: 1,
            email: 1
          }
        },
        { $sort: { fullName: 1 } },
        { $limit: boundedInteger(limit, 'limit', 500) }
      ]),

      miguelReturnTimeliness: async () => {
        const [statistics] = await aggregate(models.Loan, [
          { $match: { status: 'returned', returnDate: { $type: 'date' }, dueDate: { $type: 'date' } } },
          {
            $group: {
              _id: null,
              totalReturned: { $sum: 1 },
              onTimeReturns: {
                $sum: { $cond: [{ $lte: ['$returnDate', '$dueDate'] }, 1, 0] }
              },
              lateReturns: {
                $sum: { $cond: [{ $gt: ['$returnDate', '$dueDate'] }, 1, 0] }
              },
              averageLoanDays: {
                $avg: {
                  $divide: [{ $subtract: ['$returnDate', '$loanDate'] }, 86400000]
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              totalReturned: 1,
              onTimeReturns: 1,
              lateReturns: 1,
              averageLoanDays: { $round: ['$averageLoanDays', 1] }
            }
          }
        ]);
        return statistics || { totalReturned: 0, onTimeReturns: 0, lateReturns: 0, averageLoanDays: 0 };
      }
    }
  };
}

module.exports = { typeDefs, createAnalyticsResolvers };
