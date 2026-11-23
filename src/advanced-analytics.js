const { gql } = require('graphql-tag');
const { GraphQLError } = require('graphql');

const typeDefs = gql`
  type LibraryOverview {
    totalBooks: Int!
    totalUsers: Int!
    totalCopies: Int!
    availableCopies: Int!
    totalLoans: Int!
    activeLoans: Int!
    overdueLoans: Int!
    returnedLoans: Int!
  }

  type LibraryLoan {
    loanId: ID!
    title: String!
    author: String!
    genre: String!
    userName: String!
    email: String!
    inventoryCode: String!
    loanDate: String!
    dueDate: String!
    returnDate: String
    status: String!
    daysRemaining: Int!
    daysOverdue: Int!
  }

  type EsauGenreAvailability {
    genre: String!
    totalBooks: Int!
    totalCopies: Int!
    availableCopies: Int!
    loanedCopies: Int!
    maintenanceCopies: Int!
    availabilityPct: Float!
    utilizationPct: Float!
    totalLoans: Int!
    loansLast30Days: Int!
    loansPrevious30Days: Int!
    demandChangePct: Float
    loansPerCopy: Float!
  }

  type EsauAuthorCirculation {
    author: String!
    bookCount: Int!
    totalCopies: Int!
    availableCopies: Int!
    totalLoans: Int!
    distinctBorrowers: Int!
    lateReturns: Int!
    lateReturnPct: Float!
    loansPerBook: Float!
  }

  type EsauDecadeCirculation {
    decade: Int!
    bookCount: Int!
    totalCopies: Int!
    totalLoans: Int!
    overdueLoans: Int!
    availabilityPct: Float!
    loansPerBook: Float!
  }

  type EsauGenrePeriodAnalysis {
    genre: String!
    totalCopies: Int!
    availableCopies: Int!
    availabilityPct: Float!
    currentPeriodLoans: Int!
    previousPeriodLoans: Int!
    demandChangePct: Float
    loansPerAvailableCopy: Float
  }

  type EsauAvailableCopyHistory {
    copyId: ID!
    inventoryCode: String!
    title: String!
    author: String!
    genre: String!
    totalLoans: Int!
    uniqueBorrowers: Int!
    lastLoanDate: String
    averageLoanDays: Float
    daysSinceLastLoan: Int
  }

  type EsauSupplyRisk {
    bookId: ID!
    title: String!
    author: String!
    genre: String!
    totalCopies: Int!
    availableCopies: Int!
    availabilityPct: Float!
    totalLoans: Int!
    uniqueBorrowers: Int!
    demandPerAvailableCopy: Float
    stockRisk: String!
  }

  type EsauBookDemandRanking {
    bookId: ID!
    title: String!
    author: String!
    genre: String!
    totalLoans: Int!
    uniqueBorrowers: Int!
    loansLast90Days: Int!
    availabilityPct: Float!
    overdueRatePct: Float!
    demandScore: Float!
  }

  type EsauGenreUtilization {
    genre: String!
    totalCopies: Int!
    availableCopies: Int!
    loanedCopies: Int!
    maintenanceCopies: Int!
    utilizedCopies: Int!
    utilizationPct: Float!
    loanEvents: Int!
    loansPerCopy: Float!
    uniqueBorrowers: Int!
  }

  type EsauCatalogHealth {
    totalBooks: Int!
    booksWithCopies: Int!
    booksWithoutCopies: Int!
    booksWithoutAvailability: Int!
    totalCopies: Int!
    availableCopies: Int!
    availabilityPct: Float!
    totalLoanEvents: Int!
    loansLast90Days: Int!
    distinctAuthors: Int!
  }

  type EsauBookDemandSupply {
    bookId: ID!
    title: String!
    author: String!
    genre: String!
    totalCopies: Int!
    availableCopies: Int!
    availabilityPct: Float!
    loansLast90Days: Int!
    uniqueBorrowers: Int!
    demandPerAvailableCopy: Float
    demandClass: String!
  }

  type MiguelLoanStatusTrend {
    status: String!
    currentPeriodLoans: Int!
    previousPeriodLoans: Int!
    changePct: Float
  }

  type MiguelOverdueExposure {
    loanId: ID!
    userName: String!
    email: String!
    inventoryCode: String!
    title: String!
    genre: String!
    dueDate: String!
    daysOverdue: Int!
    overdueBand: String!
  }

  type MiguelBorrowerPerformance {
    userId: ID!
    fullName: String!
    totalLoans: Int!
    returnedLoans: Int!
    overdueLoans: Int!
    lateReturns: Int!
    onTimeReturns: Int!
    uniqueBooks: Int!
    averageLoanDays: Float
    lateReturnPct: Float!
  }

  type MiguelMonthlyReturnTrend {
    year: Int!
    month: Int!
    returnedLoans: Int!
    lateReturns: Int!
    onTimeRatePct: Float!
    previousMonthReturns: Int!
    changePct: Float
  }

  type MiguelOverdueAging {
    genre: String!
    overdueBand: String!
    overdueLoans: Int!
    affectedBorrowers: Int!
    averageDaysOverdue: Float!
    genreOverduePct: Float!
  }

  type MiguelCurrentLoan {
    loanId: ID!
    userName: String!
    email: String!
    inventoryCode: String!
    title: String!
    genre: String!
    loanDate: String!
    dueDate: String!
    effectiveStatus: String!
    daysRemaining: Int!
    daysOverdue: Int!
  }

  type MiguelGenreCirculation {
    genre: String!
    totalLoans: Int!
    activeLoans: Int!
    overdueLoans: Int!
    returnedLoans: Int!
    uniqueBorrowers: Int!
    uniqueBooks: Int!
    lateReturns: Int!
    lateReturnPct: Float!
    averageLoanDays: Float
  }

  type MiguelLoanPeriodComparison {
    currentPeriodLoans: Int!
    previousPeriodLoans: Int!
    currentReturnedLoans: Int!
    previousReturnedLoans: Int!
    currentOverdueLoans: Int!
    previousOverdueLoans: Int!
    changePct: Float
    currentPeriodStart: String!
    previousPeriodStart: String!
  }

  type MiguelBorrowerSegment {
    segment: String!
    userCount: Int!
    averageLoans: Float!
    usersWithOverdue: Int!
    averageGenreDiversity: Float!
  }

  type MiguelReturnEfficiency {
    genre: String!
    returnedLoans: Int!
    onTimeReturns: Int!
    lateReturns: Int!
    onTimeRatePct: Float!
    averageLoanDays: Float!
    averageDaysLate: Float!
    distinctBorrowers: Int!
  }

  extend type Query {
    libraryOverview: LibraryOverview!
    libraryLoans(status: String, limit: Int = 1000): [LibraryLoan!]!
    esauAvailabilityByGenre: [EsauGenreAvailability!]!
    esauAuthorCirculation(limit: Int = 20): [EsauAuthorCirculation!]!
    esauDecadeCirculation: [EsauDecadeCirculation!]!
    esauGenrePeriodAnalysis: [EsauGenrePeriodAnalysis!]!
    esauAvailableCopyHistory(genre: String, limit: Int = 100): [EsauAvailableCopyHistory!]!
    esauSupplyRisk(limit: Int = 100): [EsauSupplyRisk!]!
    esauBookDemandRanking(limit: Int = 20): [EsauBookDemandRanking!]!
    esauGenreUtilization: [EsauGenreUtilization!]!
    esauCatalogHealth: EsauCatalogHealth!
    esauBookDemandSupply(limit: Int = 100): [EsauBookDemandSupply!]!

    miguelLoanStatusTrend: [MiguelLoanStatusTrend!]!
    miguelOverdueExposure(limit: Int = 100): [MiguelOverdueExposure!]!
    miguelBorrowerPerformance(limit: Int = 100): [MiguelBorrowerPerformance!]!
    miguelMonthlyReturnTrend: [MiguelMonthlyReturnTrend!]!
    miguelOverdueAging: [MiguelOverdueAging!]!
    miguelCurrentLoanPortfolio(limit: Int = 100): [MiguelCurrentLoan!]!
    miguelGenreCirculation: [MiguelGenreCirculation!]!
    miguelLoanPeriodComparison: MiguelLoanPeriodComparison!
    miguelBorrowerSegments: [MiguelBorrowerSegment!]!
    miguelReturnEfficiency: [MiguelReturnEfficiency!]!
  }
`;

const DAY_MS = 24 * 60 * 60 * 1000;

function boundedLimit(value, maximum = 500) {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new GraphQLError(`limit debe estar entre 1 y ${maximum}.`, {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }
  return value;
}

function boundedLoanLimit(value) {
  if (!Number.isInteger(value) || value < 1 || value > 1000) {
    throw new GraphQLError('limit debe estar entre 1 y 1000.', {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }
  return value;
}

function periodBounds(now = new Date(), days = 30) {
  const currentStart = new Date(now.getTime() - days * DAY_MS);
  const previousStart = new Date(now.getTime() - 2 * days * DAY_MS);
  return { now, currentStart, previousStart };
}

function percent(numerator, denominator) {
  return {
    $cond: [
      { $gt: [denominator, 0] },
      { $round: [{ $multiply: [{ $divide: [numerator, denominator] }, 100] }, 1] },
      0
    ]
  };
}

function rateChange(current, previous) {
  return {
    $cond: [
      { $gt: [previous, 0] },
      { $round: [{ $multiply: [{ $divide: [{ $subtract: [current, previous] }, previous] }, 100] }, 1] },
      { $cond: [{ $gt: [current, 0] }, null, 0] }
    ]
  };
}

function dateString(field) {
  return {
    $dateToString: {
      date: field,
      format: '%Y-%m-%dT%H:%M:%S.%LZ',
      timezone: 'UTC',
      onNull: null
    }
  };
}

function dateBeforeUtcDay(field, date) {
  return {
    $lt: [
      { $dateToString: { date: field, format: '%Y-%m-%d', timezone: 'UTC' } },
      date.toISOString().slice(0, 10)
    ]
  };
}

function bookCirculationStages(now, currentStart, previousStart) {
  return [
    { $lookup: { from: 'copies', localField: '_id', foreignField: 'book', as: 'copies' } },
    { $lookup: { from: 'loans', localField: 'copies._id', foreignField: 'copy', as: 'loans' } },
    {
      $addFields: {
        totalCopies: { $size: '$copies' },
        availableCopies: {
          $size: { $filter: { input: '$copies', as: 'copy', cond: { $eq: ['$$copy.status', 'available'] } } }
        },
        loanedCopies: {
          $size: { $filter: { input: '$copies', as: 'copy', cond: { $eq: ['$$copy.status', 'loaned'] } } }
        },
        maintenanceCopies: {
          $size: { $filter: { input: '$copies', as: 'copy', cond: { $eq: ['$$copy.status', 'maintenance'] } } }
        },
        totalLoans: { $size: '$loans' },
        uniqueBorrowers: {
          $size: {
            $setUnion: [{ $map: { input: '$loans', as: 'loan', in: '$$loan.user' } }, []]
          }
        },
        borrowerIds: {
          $setUnion: [{ $map: { input: '$loans', as: 'loan', in: '$$loan.user' } }, []]
        },
        activeLoans: {
          $size: { $filter: { input: '$loans', as: 'loan', cond: { $eq: ['$$loan.status', 'active'] } } }
        },
        overdueLoans: {
          $size: { $filter: { input: '$loans', as: 'loan', cond: { $eq: ['$$loan.status', 'overdue'] } } }
        },
        returnedLoans: {
          $size: { $filter: { input: '$loans', as: 'loan', cond: { $eq: ['$$loan.status', 'returned'] } } }
        },
        lateReturns: {
          $size: {
            $filter: {
              input: '$loans',
              as: 'loan',
              cond: {
                $and: [
                  { $eq: ['$$loan.status', 'returned'] },
                  { $gt: ['$$loan.returnDate', '$$loan.dueDate'] }
                ]
              }
            }
          }
        },
        loansLast30Days: {
          $size: {
            $filter: { input: '$loans', as: 'loan', cond: { $gte: ['$$loan.loanDate', currentStart] } }
          }
        },
        loansPrevious30Days: {
          $size: {
            $filter: {
              input: '$loans',
              as: 'loan',
              cond: {
                $and: [
                  { $gte: ['$$loan.loanDate', previousStart] },
                  { $lt: ['$$loan.loanDate', currentStart] }
                ]
              }
            }
          }
        },
        loansLast90Days: {
          $size: {
            $filter: {
              input: '$loans',
              as: 'loan',
              cond: { $gte: ['$$loan.loanDate', new Date(now.getTime() - 90 * DAY_MS)] }
            }
          }
        }
      }
    }
  ];
}

function aggregate(model, pipeline) {
  return model.aggregate(pipeline).exec();
}

function createAdvancedResolvers(models) {
  return {
    Query: {
      libraryOverview: async () => {
        const now = new Date();
        const todayStart = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
        const [
          totalBooks,
          totalUsers,
          totalCopies,
          availableCopies,
          totalLoans,
          activeLoans,
          overdueLoans,
          returnedLoans
        ] = await Promise.all([
          models.Book.countDocuments({}),
          models.User.countDocuments({}),
          models.Copy.countDocuments({}),
          models.Copy.countDocuments({ status: 'available' }),
          models.Loan.countDocuments({}),
          models.Loan.countDocuments({
            status: { $in: ['active', 'overdue'] },
            dueDate: { $gte: todayStart }
          }),
          models.Loan.countDocuments({
            status: { $in: ['active', 'overdue'] },
            dueDate: { $lt: todayStart }
          }),
          models.Loan.countDocuments({ status: 'returned' })
        ]);
        return {
          totalBooks,
          totalUsers,
          totalCopies,
          availableCopies,
          totalLoans,
          activeLoans,
          overdueLoans,
          returnedLoans
        };
      },

      libraryLoans: (_, { status, limit }) => {
        if (status && !['active', 'overdue', 'returned'].includes(status)) {
          throw new GraphQLError('El filtro de estado no es válido.', {
            extensions: { code: 'BAD_USER_INPUT' }
          });
        }
        const now = new Date();
        const todayStart = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
        const pipeline = [
          { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
          { $unwind: '$user' },
          { $lookup: { from: 'copies', localField: 'copy', foreignField: '_id', as: 'copy' } },
          { $unwind: '$copy' },
          { $lookup: { from: 'books', localField: 'copy.book', foreignField: '_id', as: 'book' } },
          { $unwind: '$book' },
          {
            $addFields: {
              effectiveStatus: {
                $cond: [
                  { $eq: ['$status', 'returned'] },
                  'returned',
                  { $cond: [dateBeforeUtcDay('$dueDate', now), 'overdue', 'active'] }
                ]
              },
              daysRemaining: {
                $cond: [
                  { $and: [{ $ne: ['$status', 'returned'] }, { $not: [dateBeforeUtcDay('$dueDate', now)] }] },
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
                      dateBeforeUtcDay('$dueDate', now),
                      { $dateDiff: { startDate: '$dueDate', endDate: todayStart, unit: 'day' } },
                      0
                    ]
                  }
                ]
              }
            }
          }
        ];
        if (status) pipeline.push({ $match: { effectiveStatus: status } });
        pipeline.push(
          {
            $project: {
              _id: 0,
              loanId: { $toString: '$_id' },
              title: '$book.title',
              author: '$book.author',
              genre: { $ifNull: ['$book.genre', 'Sin género'] },
              userName: '$user.fullName',
              email: '$user.email',
              inventoryCode: '$copy.inventoryCode',
              loanDate: dateString('$loanDate'),
              dueDate: dateString('$dueDate'),
              returnDate: dateString('$returnDate'),
              status: '$effectiveStatus',
              daysRemaining: 1,
              daysOverdue: 1
            }
          },
          { $sort: { loanDate: -1, loanId: 1 } },
          { $limit: boundedLoanLimit(limit) }
        );
        return aggregate(models.Loan, pipeline);
      },

      esauAvailabilityByGenre: () => {
        const { now, currentStart, previousStart } = periodBounds();
        return aggregate(models.Book, [
          ...bookCirculationStages(now, currentStart, previousStart),
          {
            $group: {
              _id: { $ifNull: ['$genre', 'Sin género'] },
              totalBooks: { $sum: 1 },
              totalCopies: { $sum: '$totalCopies' },
              availableCopies: { $sum: '$availableCopies' },
              loanedCopies: { $sum: '$loanedCopies' },
              maintenanceCopies: { $sum: '$maintenanceCopies' },
              totalLoans: { $sum: '$totalLoans' },
              loansLast30Days: { $sum: '$loansLast30Days' },
              loansPrevious30Days: { $sum: '$loansPrevious30Days' }
            }
          },
          {
            $project: {
              _id: 0,
              genre: '$_id',
              totalBooks: 1,
              totalCopies: 1,
              availableCopies: 1,
              loanedCopies: 1,
              maintenanceCopies: 1,
              totalLoans: 1,
              loansLast30Days: 1,
              loansPrevious30Days: 1,
              availabilityPct: percent('$availableCopies', '$totalCopies'),
              utilizationPct: percent('$loanedCopies', '$totalCopies'),
              demandChangePct: rateChange('$loansLast30Days', '$loansPrevious30Days'),
              loansPerCopy: {
                $cond: [
                  { $gt: ['$totalCopies', 0] },
                  { $round: [{ $divide: ['$totalLoans', '$totalCopies'] }, 2] },
                  0
                ]
              }
            }
          },
          { $sort: { totalLoans: -1, genre: 1 } }
        ]);
      },

      esauAuthorCirculation: (_, { limit }) => {
        const { now, currentStart, previousStart } = periodBounds();
        return aggregate(models.Book, [
          ...bookCirculationStages(now, currentStart, previousStart),
          {
            $group: {
              _id: '$author',
              bookCount: { $sum: 1 },
              totalCopies: { $sum: '$totalCopies' },
              availableCopies: { $sum: '$availableCopies' },
              totalLoans: { $sum: '$totalLoans' },
              borrowerSets: { $push: '$borrowerIds' },
              returnedLoans: { $sum: '$returnedLoans' },
              lateReturns: { $sum: '$lateReturns' }
            }
          },
          {
            $addFields: {
              allBorrowers: {
                $reduce: {
                  input: '$borrowerSets',
                  initialValue: [],
                  in: { $setUnion: ['$$value', '$$this'] }
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              author: '$_id',
              bookCount: 1,
              totalCopies: 1,
              availableCopies: 1,
              totalLoans: 1,
              distinctBorrowers: { $size: '$allBorrowers' },
              lateReturns: 1,
              lateReturnPct: percent('$lateReturns', '$returnedLoans'),
              loansPerBook: {
                $cond: [
                  { $gt: ['$bookCount', 0] },
                  { $round: [{ $divide: ['$totalLoans', '$bookCount'] }, 2] },
                  0
                ]
              }
            }
          },
          { $sort: { totalLoans: -1, lateReturnPct: -1, author: 1 } },
          { $limit: boundedLimit(limit, 100) }
        ]);
      },

      esauDecadeCirculation: () => {
        const { now, currentStart, previousStart } = periodBounds();
        return aggregate(models.Book, [
          { $match: { publishedYear: { $type: 'number' } } },
          ...bookCirculationStages(now, currentStart, previousStart),
          {
            $group: {
              _id: { $subtract: ['$publishedYear', { $mod: ['$publishedYear', 10] }] },
              bookCount: { $sum: 1 },
              totalCopies: { $sum: '$totalCopies' },
              availableCopies: { $sum: '$availableCopies' },
              totalLoans: { $sum: '$totalLoans' },
              overdueLoans: { $sum: '$overdueLoans' }
            }
          },
          {
            $project: {
              _id: 0,
              decade: '$_id',
              bookCount: 1,
              totalCopies: 1,
              totalLoans: 1,
              overdueLoans: 1,
              availabilityPct: percent('$availableCopies', '$totalCopies'),
              loansPerBook: {
                $cond: [
                  { $gt: ['$bookCount', 0] },
                  { $round: [{ $divide: ['$totalLoans', '$bookCount'] }, 2] },
                  0
                ]
              }
            }
          },
          { $sort: { decade: 1 } }
        ]);
      },

      esauGenrePeriodAnalysis: () => {
        const { now, currentStart, previousStart } = periodBounds();
        return aggregate(models.Book, [
          ...bookCirculationStages(now, currentStart, previousStart),
          {
            $group: {
              _id: { $ifNull: ['$genre', 'Sin género'] },
              totalCopies: { $sum: '$totalCopies' },
              availableCopies: { $sum: '$availableCopies' },
              currentPeriodLoans: { $sum: '$loansLast30Days' },
              previousPeriodLoans: { $sum: '$loansPrevious30Days' }
            }
          },
          {
            $project: {
              _id: 0,
              genre: '$_id',
              totalCopies: 1,
              availableCopies: 1,
              currentPeriodLoans: 1,
              previousPeriodLoans: 1,
              availabilityPct: percent('$availableCopies', '$totalCopies'),
              demandChangePct: rateChange('$currentPeriodLoans', '$previousPeriodLoans'),
              loansPerAvailableCopy: {
                $cond: [
                  { $gt: ['$availableCopies', 0] },
                  { $round: [{ $divide: ['$currentPeriodLoans', '$availableCopies'] }, 2] },
                  null
                ]
              }
            }
          },
          { $sort: { currentPeriodLoans: -1, genre: 1 } }
        ]);
      },

      esauAvailableCopyHistory: (_, { genre, limit }) => {
        const now = new Date();
        const pipeline = [
          { $match: { status: 'available' } },
          { $lookup: { from: 'books', localField: 'book', foreignField: '_id', as: 'book' } },
          { $unwind: '$book' }
        ];
        if (genre) pipeline.push({ $match: { 'book.genre': genre } });
        pipeline.push(
          { $lookup: { from: 'loans', localField: '_id', foreignField: 'copy', as: 'loans' } },
          {
            $addFields: {
              totalLoans: { $size: '$loans' },
              uniqueBorrowers: {
                $size: { $setUnion: [{ $map: { input: '$loans', as: 'loan', in: '$$loan.user' } }, []] }
              },
              lastLoanAt: { $max: '$loans.loanDate' },
              averageLoanDays: {
                $avg: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$loans',
                        as: 'loan',
                        cond: {
                          $and: [
                            { $eq: ['$$loan.status', 'returned'] },
                            { $eq: [{ $type: '$$loan.returnDate' }, 'date'] }
                          ]
                        }
                      }
                    },
                    as: 'loan',
                    in: { $dateDiff: { startDate: '$$loan.loanDate', endDate: '$$loan.returnDate', unit: 'day' } }
                  }
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              copyId: { $toString: '$_id' },
              inventoryCode: 1,
              title: '$book.title',
              author: '$book.author',
              genre: { $ifNull: ['$book.genre', 'Sin género'] },
              totalLoans: 1,
              uniqueBorrowers: 1,
              lastLoanDate: dateString('$lastLoanAt'),
              averageLoanDays: { $round: ['$averageLoanDays', 1] },
              daysSinceLastLoan: {
                $cond: [
                  { $eq: [{ $type: '$lastLoanAt' }, 'date'] },
                  { $dateDiff: { startDate: '$lastLoanAt', endDate: now, unit: 'day' } },
                  null
                ]
              }
            }
          },
          { $sort: { totalLoans: -1, daysSinceLastLoan: 1, inventoryCode: 1 } },
          { $limit: boundedLimit(limit) }
        );
        return aggregate(models.Copy, pipeline);
      },

      esauSupplyRisk: (_, { limit }) => {
        const { now, currentStart, previousStart } = periodBounds();
        return aggregate(models.Book, [
          ...bookCirculationStages(now, currentStart, previousStart),
          {
            $addFields: {
              availabilityPct: percent('$availableCopies', '$totalCopies'),
              stockRisk: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$totalCopies', 0] }, then: 'Sin ejemplares' },
                    { case: { $eq: ['$availableCopies', 0] }, then: 'Sin disponibilidad' },
                    { case: { $lte: [percent('$availableCopies', '$totalCopies'), 30] }, then: 'Crítico' }
                  ],
                  default: 'Vigilancia'
                }
              }
            }
          },
          { $match: { stockRisk: { $in: ['Sin ejemplares', 'Sin disponibilidad', 'Crítico'] } } },
          {
            $project: {
              _id: 0,
              bookId: { $toString: '$_id' },
              title: 1,
              author: 1,
              genre: { $ifNull: ['$genre', 'Sin género'] },
              totalCopies: 1,
              availableCopies: 1,
              availabilityPct: 1,
              totalLoans: 1,
              uniqueBorrowers: 1,
              demandPerAvailableCopy: {
                $cond: [
                  { $gt: ['$availableCopies', 0] },
                  { $round: [{ $divide: ['$totalLoans', '$availableCopies'] }, 2] },
                  null
                ]
              },
              stockRisk: 1
            }
          },
          { $sort: { totalLoans: -1, availabilityPct: 1, title: 1 } },
          { $limit: boundedLimit(limit) }
        ]);
      },

      esauBookDemandRanking: (_, { limit }) => {
        const { now, currentStart, previousStart } = periodBounds(new Date(), 90);
        return aggregate(models.Book, [
          ...bookCirculationStages(now, currentStart, previousStart),
          { $match: { totalLoans: { $gt: 0 } } },
          {
            $project: {
              _id: 0,
              bookId: { $toString: '$_id' },
              title: 1,
              author: 1,
              genre: { $ifNull: ['$genre', 'Sin género'] },
              totalLoans: 1,
              uniqueBorrowers: 1,
              loansLast90Days: 1,
              availabilityPct: percent('$availableCopies', '$totalCopies'),
              overdueRatePct: percent('$overdueLoans', '$totalLoans'),
              demandScore: {
                $round: [
                  {
                    $multiply: [
                      { $divide: ['$loansLast90Days', { $max: ['$totalCopies', 1] }] },
                      { $subtract: [1, { $divide: ['$availableCopies', { $max: ['$totalCopies', 1] }] }] }
                    ]
                  },
                  2
                ]
              }
            }
          },
          { $sort: { demandScore: -1, totalLoans: -1, title: 1 } },
          { $limit: boundedLimit(limit, 100) }
        ]);
      },

      esauGenreUtilization: () => aggregate(models.Copy, [
        { $lookup: { from: 'books', localField: 'book', foreignField: '_id', as: 'book' } },
        { $unwind: '$book' },
        { $lookup: { from: 'loans', localField: '_id', foreignField: 'copy', as: 'loans' } },
        {
          $addFields: {
            loanEvents: { $size: '$loans' },
            borrowers: { $map: { input: '$loans', as: 'loan', in: '$$loan.user' } }
          }
        },
        {
          $group: {
            _id: { $ifNull: ['$book.genre', 'Sin género'] },
            totalCopies: { $sum: 1 },
            availableCopies: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
            loanedCopies: { $sum: { $cond: [{ $eq: ['$status', 'loaned'] }, 1, 0] } },
            maintenanceCopies: { $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] } },
            loanEvents: { $sum: '$loanEvents' },
            copyBorrowers: { $push: '$borrowers' }
          }
        },
        {
          $addFields: {
            allBorrowers: {
              $reduce: {
                input: '$copyBorrowers',
                initialValue: [],
                in: { $setUnion: ['$$value', '$$this'] }
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            genre: '$_id',
            totalCopies: 1,
            availableCopies: 1,
            loanedCopies: 1,
            maintenanceCopies: 1,
            utilizedCopies: { $subtract: ['$totalCopies', '$availableCopies'] },
            utilizationPct: percent({ $subtract: ['$totalCopies', '$availableCopies'] }, '$totalCopies'),
            loanEvents: 1,
            loansPerCopy: { $round: [{ $divide: ['$loanEvents', '$totalCopies'] }, 2] },
            uniqueBorrowers: { $size: '$allBorrowers' }
          }
        },
        { $sort: { utilizationPct: -1, genre: 1 } }
      ]),

      esauCatalogHealth: async () => {
        const now = new Date();
        const [health] = await aggregate(models.Book, [
          { $lookup: { from: 'copies', localField: '_id', foreignField: 'book', as: 'copies' } },
          { $lookup: { from: 'loans', localField: 'copies._id', foreignField: 'copy', as: 'loans' } },
          {
            $facet: {
              catalog: [
                {
                  $group: {
                    _id: null,
                    totalBooks: { $sum: 1 },
                    booksWithCopies: { $sum: { $cond: [{ $gt: [{ $size: '$copies' }, 0] }, 1, 0] } },
                    booksWithoutCopies: { $sum: { $cond: [{ $eq: [{ $size: '$copies' }, 0] }, 1, 0] } },
                    booksWithoutAvailability: {
                      $sum: {
                        $cond: [
                          {
                            $eq: [
                              {
                                $size: {
                                  $filter: {
                                    input: '$copies',
                                    as: 'copy',
                                    cond: { $eq: ['$$copy.status', 'available'] }
                                  }
                                }
                              },
                              0
                            ]
                          },
                          1,
                          0
                        ]
                      }
                    },
                    distinctAuthors: { $addToSet: '$author' }
                  }
                }
              ],
              inventory: [
                { $unwind: { path: '$copies', preserveNullAndEmptyArrays: true } },
                {
                  $group: {
                    _id: null,
                    totalCopies: { $sum: { $cond: [{ $ne: ['$copies._id', null] }, 1, 0] } },
                    availableCopies: { $sum: { $cond: [{ $eq: ['$copies.status', 'available'] }, 1, 0] } }
                  }
                }
              ],
              circulation: [
                { $unwind: '$loans' },
                {
                  $group: {
                    _id: null,
                    totalLoanEvents: { $sum: 1 },
                    loansLast90Days: {
                      $sum: { $cond: [{ $gte: ['$loans.loanDate', new Date(now.getTime() - 90 * DAY_MS)] }, 1, 0] }
                    }
                  }
                }
              ]
            }
          },
          {
            $project: {
              _id: 0,
              catalog: { $arrayElemAt: ['$catalog', 0] },
              inventory: { $arrayElemAt: ['$inventory', 0] },
              circulation: { $arrayElemAt: ['$circulation', 0] }
            }
          },
          {
            $project: {
              totalBooks: { $ifNull: ['$catalog.totalBooks', 0] },
              booksWithCopies: { $ifNull: ['$catalog.booksWithCopies', 0] },
              booksWithoutCopies: { $ifNull: ['$catalog.booksWithoutCopies', 0] },
              booksWithoutAvailability: { $ifNull: ['$catalog.booksWithoutAvailability', 0] },
              totalCopies: { $ifNull: ['$inventory.totalCopies', 0] },
              availableCopies: { $ifNull: ['$inventory.availableCopies', 0] },
              totalLoanEvents: { $ifNull: ['$circulation.totalLoanEvents', 0] },
              loansLast90Days: { $ifNull: ['$circulation.loansLast90Days', 0] },
              distinctAuthors: { $size: { $ifNull: ['$catalog.distinctAuthors', []] } }
            }
          },
          {
            $addFields: {
              availabilityPct: percent('$availableCopies', '$totalCopies')
            }
          }
        ]);
        return health || {
          totalBooks: 0,
          booksWithCopies: 0,
          booksWithoutCopies: 0,
          booksWithoutAvailability: 0,
          totalCopies: 0,
          availableCopies: 0,
          availabilityPct: 0,
          totalLoanEvents: 0,
          loansLast90Days: 0,
          distinctAuthors: 0
        };
      },

      esauBookDemandSupply: (_, { limit }) => {
        const { now, currentStart, previousStart } = periodBounds();
        return aggregate(models.Book, [
          ...bookCirculationStages(now, currentStart, previousStart),
          { $match: { loansLast90Days: { $gt: 0 } } },
          {
            $addFields: {
              availabilityPct: percent('$availableCopies', '$totalCopies'),
              demandPerAvailableCopy: {
                $cond: [
                  { $gt: ['$availableCopies', 0] },
                  { $round: [{ $divide: ['$loansLast90Days', '$availableCopies'] }, 2] },
                  null
                ]
              },
              demandClass: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$availableCopies', 0] }, then: 'Demanda sin disponibilidad' },
                    { case: { $lte: [percent('$availableCopies', '$totalCopies'), 30] }, then: 'Demanda alta / stock crítico' },
                    { case: { $gte: ['$loansLast90Days', 3] }, then: 'Demanda recurrente' }
                  ],
                  default: 'Demanda reciente'
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              bookId: { $toString: '$_id' },
              title: 1,
              author: 1,
              genre: { $ifNull: ['$genre', 'Sin género'] },
              totalCopies: 1,
              availableCopies: 1,
              availabilityPct: 1,
              loansLast90Days: 1,
              uniqueBorrowers: 1,
              demandPerAvailableCopy: 1,
              demandClass: 1
            }
          },
          { $sort: { demandPerAvailableCopy: -1, loansLast90Days: -1, title: 1 } },
          { $limit: boundedLimit(limit) }
        ]);
      },

      miguelLoanStatusTrend: () => {
        const { now, currentStart, previousStart } = periodBounds();
        return aggregate(models.Loan, [
          {
            $facet: {
              current: [
                { $match: { loanDate: { $gte: currentStart, $lte: now } } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
              ],
              previous: [
                { $match: { loanDate: { $gte: previousStart, $lt: currentStart } } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
              ]
            }
          },
          {
            $project: {
              current: 1,
              previous: 1,
              statuses: {
                $setUnion: [
                  { $map: { input: '$current', as: 'row', in: '$$row._id' } },
                  { $map: { input: '$previous', as: 'row', in: '$$row._id' } }
                ]
              }
            }
          },
          { $unwind: '$statuses' },
          {
            $addFields: {
              currentCount: {
                $let: {
                  vars: {
                    row: {
                      $arrayElemAt: [
                        { $filter: { input: '$current', as: 'item', cond: { $eq: ['$$item._id', '$statuses'] } } },
                        0
                      ]
                    }
                  },
                  in: { $ifNull: ['$$row.count', 0] }
                }
              },
              previousCount: {
                $let: {
                  vars: {
                    row: {
                      $arrayElemAt: [
                        { $filter: { input: '$previous', as: 'item', cond: { $eq: ['$$item._id', '$statuses'] } } },
                        0
                      ]
                    }
                  },
                  in: { $ifNull: ['$$row.count', 0] }
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              status: '$statuses',
              currentPeriodLoans: '$currentCount',
              previousPeriodLoans: '$previousCount',
              changePct: rateChange('$currentCount', '$previousCount')
            }
          },
          { $sort: { status: 1 } }
        ]);
      },

      miguelOverdueExposure: (_, { limit }) => {
        const now = new Date();
        const todayStart = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
        return aggregate(models.Loan, [
          {
            $match: {
              status: { $in: ['active', 'overdue'] },
              $expr: dateBeforeUtcDay('$dueDate', now)
            }
          },
          { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
          { $unwind: '$user' },
          { $lookup: { from: 'copies', localField: 'copy', foreignField: '_id', as: 'copy' } },
          { $unwind: '$copy' },
          { $lookup: { from: 'books', localField: 'copy.book', foreignField: '_id', as: 'book' } },
          { $unwind: '$book' },
          {
            $addFields: {
              daysOverdue: { $dateDiff: { startDate: '$dueDate', endDate: todayStart, unit: 'day' } }
            }
          },
          {
            $addFields: {
              overdueBand: {
                $switch: {
                  branches: [
                    { case: { $lt: ['$daysOverdue', 7] }, then: '1-6 días' },
                    { case: { $lt: ['$daysOverdue', 30] }, then: '7-29 días' }
                  ],
                  default: '30 días o más'
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              loanId: { $toString: '$_id' },
              userName: '$user.fullName',
              email: '$user.email',
              inventoryCode: '$copy.inventoryCode',
              title: '$book.title',
              genre: { $ifNull: ['$book.genre', 'Sin género'] },
              dueDate: dateString('$dueDate'),
              daysOverdue: 1,
              overdueBand: 1
            }
          },
          { $sort: { daysOverdue: -1, genre: 1 } },
          { $limit: boundedLimit(limit) }
        ]);
      },

      miguelBorrowerPerformance: (_, { limit }) => aggregate(models.Loan, [
        { $lookup: { from: 'copies', localField: 'copy', foreignField: '_id', as: 'copy' } },
        { $unwind: '$copy' },
        { $lookup: { from: 'books', localField: 'copy.book', foreignField: '_id', as: 'book' } },
        { $unwind: '$book' },
        {
          $addFields: {
            loanDays: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'returned'] },
                    { $eq: [{ $type: '$returnDate' }, 'date'] }
                  ]
                },
                { $dateDiff: { startDate: '$loanDate', endDate: '$returnDate', unit: 'day' } },
                null
              ]
            },
            wasLate: {
              $and: [
                { $eq: ['$status', 'returned'] },
                { $gt: ['$returnDate', '$dueDate'] }
              ]
            },
            wasOnTime: {
              $and: [
                { $eq: ['$status', 'returned'] },
                { $lte: ['$returnDate', '$dueDate'] }
              ]
            }
          }
        },
        {
          $group: {
            _id: '$user',
            totalLoans: { $sum: 1 },
            returnedLoans: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } },
            overdueLoans: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
            lateReturns: { $sum: { $cond: ['$wasLate', 1, 0] } },
            onTimeReturns: { $sum: { $cond: ['$wasOnTime', 1, 0] } },
            uniqueBooks: { $addToSet: '$book._id' },
            averageLoanDays: { $avg: '$loanDays' }
          }
        },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: { $toString: '$user._id' },
            fullName: '$user.fullName',
            totalLoans: 1,
            returnedLoans: 1,
            overdueLoans: 1,
            lateReturns: 1,
            onTimeReturns: 1,
            uniqueBooks: { $size: '$uniqueBooks' },
            averageLoanDays: { $round: ['$averageLoanDays', 1] },
            lateReturnPct: percent('$lateReturns', '$returnedLoans')
          }
        },
        { $sort: { lateReturnPct: -1, totalLoans: -1, fullName: 1 } },
        { $limit: boundedLimit(limit) }
      ]),

      miguelMonthlyReturnTrend: () => aggregate(models.Loan, [
        { $match: { status: 'returned', returnDate: { $type: 'date' }, dueDate: { $type: 'date' } } },
        {
          $group: {
            _id: {
              year: { $year: { date: '$returnDate', timezone: 'UTC' } },
              month: { $month: { date: '$returnDate', timezone: 'UTC' } }
            },
            returnedLoans: { $sum: 1 },
            lateReturns: {
              $sum: { $cond: [{ $gt: ['$returnDate', '$dueDate'] }, 1, 0] }
            },
            onTimeReturns: {
              $sum: { $cond: [{ $lte: ['$returnDate', '$dueDate'] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            _id: 0,
            year: '$_id.year',
            month: '$_id.month',
            returnedLoans: 1,
            lateReturns: 1,
            onTimeReturns: 1,
            onTimeRatePct: percent('$onTimeReturns', '$returnedLoans')
          }
        },
        { $sort: { year: 1, month: 1 } },
        {
          $setWindowFields: {
            sortBy: { year: 1, month: 1 },
            output: {
              previousMonthReturns: {
                $shift: { output: '$returnedLoans', by: -1, default: 0 }
              }
            }
          }
        },
        {
          $addFields: {
            changePct: rateChange('$returnedLoans', '$previousMonthReturns')
          }
        },
        { $project: { onTimeReturns: 0 } }
      ]),

      miguelOverdueAging: () => {
        const now = new Date();
        const todayStart = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
        return aggregate(models.Loan, [
          {
            $match: {
              status: { $in: ['active', 'overdue'] },
              $expr: dateBeforeUtcDay('$dueDate', now)
            }
          },
          { $lookup: { from: 'copies', localField: 'copy', foreignField: '_id', as: 'copy' } },
          { $unwind: '$copy' },
          { $lookup: { from: 'books', localField: 'copy.book', foreignField: '_id', as: 'book' } },
          { $unwind: '$book' },
          {
            $addFields: {
              daysOverdue: { $dateDiff: { startDate: '$dueDate', endDate: todayStart, unit: 'day' } }
            }
          },
          {
            $addFields: {
              overdueBand: {
                $switch: {
                  branches: [
                    { case: { $lt: ['$daysOverdue', 7] }, then: '1-6 días' },
                    { case: { $lt: ['$daysOverdue', 30] }, then: '7-29 días' }
                  ],
                  default: '30 días o más'
                }
              }
            }
          },
          {
            $group: {
              _id: {
                genre: { $ifNull: ['$book.genre', 'Sin género'] },
                band: '$overdueBand'
              },
              overdueLoans: { $sum: 1 },
              affectedBorrowers: { $addToSet: '$user' },
              averageDaysOverdue: { $avg: '$daysOverdue' }
            }
          },
          {
            $project: {
              _id: 0,
              genre: '$_id.genre',
              overdueBand: '$_id.band',
              overdueLoans: 1,
              affectedBorrowers: { $size: '$affectedBorrowers' },
              averageDaysOverdue: { $round: ['$averageDaysOverdue', 1] }
            }
          },
          {
            $setWindowFields: {
              partitionBy: '$genre',
              output: { genreOverdueTotal: { $sum: '$overdueLoans' } }
            }
          },
          {
            $addFields: {
              genreOverduePct: percent('$overdueLoans', '$genreOverdueTotal')
            }
          },
          { $sort: { genre: 1, averageDaysOverdue: -1 } }
        ]);
      },

      miguelCurrentLoanPortfolio: (_, { limit }) => {
        const now = new Date();
        const todayStart = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
        return aggregate(models.Loan, [
          { $match: { status: { $in: ['active', 'overdue'] } } },
          { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
          { $unwind: '$user' },
          { $lookup: { from: 'copies', localField: 'copy', foreignField: '_id', as: 'copy' } },
          { $unwind: '$copy' },
          { $lookup: { from: 'books', localField: 'copy.book', foreignField: '_id', as: 'book' } },
          { $unwind: '$book' },
          {
            $addFields: {
              effectiveStatus: {
                $cond: [dateBeforeUtcDay('$dueDate', now), 'overdue', 'active']
              },
              daysRemaining: {
                $cond: [
                  { $not: [dateBeforeUtcDay('$dueDate', now)] },
                  { $dateDiff: { startDate: todayStart, endDate: '$dueDate', unit: 'day' } },
                  0
                ]
              },
              daysOverdue: {
                $cond: [
                  dateBeforeUtcDay('$dueDate', now),
                  { $dateDiff: { startDate: '$dueDate', endDate: todayStart, unit: 'day' } },
                  0
                ]
              }
            }
          },
          {
            $project: {
              _id: 0,
              loanId: { $toString: '$_id' },
              userName: '$user.fullName',
              email: '$user.email',
              inventoryCode: '$copy.inventoryCode',
              title: '$book.title',
              genre: { $ifNull: ['$book.genre', 'Sin género'] },
              loanDate: dateString('$loanDate'),
              dueDate: dateString('$dueDate'),
              effectiveStatus: 1,
              daysRemaining: 1,
              daysOverdue: 1
            }
          },
          { $sort: { daysOverdue: -1, dueDate: 1 } },
          { $limit: boundedLimit(limit) }
        ]);
      },

      miguelGenreCirculation: () => aggregate(models.Loan, [
        { $lookup: { from: 'copies', localField: 'copy', foreignField: '_id', as: 'copy' } },
        { $unwind: '$copy' },
        { $lookup: { from: 'books', localField: 'copy.book', foreignField: '_id', as: 'book' } },
        { $unwind: '$book' },
        {
          $addFields: {
            returnedDays: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'returned'] },
                    { $eq: [{ $type: '$returnDate' }, 'date'] }
                  ]
                },
                { $dateDiff: { startDate: '$loanDate', endDate: '$returnDate', unit: 'day' } },
                null
              ]
            },
            lateReturn: {
              $and: [
                { $eq: ['$status', 'returned'] },
                { $gt: ['$returnDate', '$dueDate'] }
              ]
            }
          }
        },
        {
          $group: {
            _id: { $ifNull: ['$book.genre', 'Sin género'] },
            totalLoans: { $sum: 1 },
            activeLoans: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            overdueLoans: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
            returnedLoans: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } },
            uniqueBorrowers: { $addToSet: '$user' },
            uniqueBooks: { $addToSet: '$book._id' },
            lateReturns: { $sum: { $cond: ['$lateReturn', 1, 0] } },
            averageLoanDays: { $avg: '$returnedDays' }
          }
        },
        {
          $project: {
            _id: 0,
            genre: '$_id',
            totalLoans: 1,
            activeLoans: 1,
            overdueLoans: 1,
            returnedLoans: 1,
            uniqueBorrowers: { $size: '$uniqueBorrowers' },
            uniqueBooks: { $size: '$uniqueBooks' },
            lateReturns: 1,
            lateReturnPct: percent('$lateReturns', '$returnedLoans'),
            averageLoanDays: { $round: ['$averageLoanDays', 1] }
          }
        },
        { $sort: { totalLoans: -1, genre: 1 } }
      ]),

      miguelLoanPeriodComparison: async () => {
        const { now, currentStart, previousStart } = periodBounds();
        const [comparison] = await aggregate(models.Loan, [
          {
            $facet: {
              current: [
                { $match: { loanDate: { $gte: currentStart, $lte: now } } },
                {
                  $group: {
                    _id: null,
                    total: { $sum: 1 },
                    returned: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } },
                    overdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } }
                  }
                }
              ],
              previous: [
                { $match: { loanDate: { $gte: previousStart, $lt: currentStart } } },
                {
                  $group: {
                    _id: null,
                    total: { $sum: 1 },
                    returned: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } },
                    overdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } }
                  }
                }
              ]
            }
          },
          {
            $project: {
              current: { $ifNull: [{ $arrayElemAt: ['$current', 0] }, { total: 0, returned: 0, overdue: 0 }] },
              previous: { $ifNull: [{ $arrayElemAt: ['$previous', 0] }, { total: 0, returned: 0, overdue: 0 }] }
            }
          },
          {
            $project: {
              _id: 0,
              currentPeriodLoans: '$current.total',
              previousPeriodLoans: '$previous.total',
              currentReturnedLoans: '$current.returned',
              previousReturnedLoans: '$previous.returned',
              currentOverdueLoans: '$current.overdue',
              previousOverdueLoans: '$previous.overdue',
              changePct: rateChange('$current.total', '$previous.total'),
              currentPeriodStart: dateString(currentStart),
              previousPeriodStart: dateString(previousStart)
            }
          }
        ]);
        return comparison || {
          currentPeriodLoans: 0,
          previousPeriodLoans: 0,
          currentReturnedLoans: 0,
          previousReturnedLoans: 0,
          currentOverdueLoans: 0,
          previousOverdueLoans: 0,
          changePct: 0,
          currentPeriodStart: dateStringValue(currentStart),
          previousPeriodStart: dateStringValue(previousStart)
        };
      },

      miguelBorrowerSegments: () => aggregate(models.User, [
        {
          $lookup: {
            from: 'loans',
            let: { borrowerId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$user', '$$borrowerId'] } } },
              { $lookup: { from: 'copies', localField: 'copy', foreignField: '_id', as: 'copy' } },
              { $unwind: '$copy' },
              { $lookup: { from: 'books', localField: 'copy.book', foreignField: '_id', as: 'book' } },
              { $unwind: '$book' },
              {
                $group: {
                  _id: null,
                  totalLoans: { $sum: 1 },
                  overdueLoans: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
                  returnedLoans: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } },
                  genres: { $addToSet: { $ifNull: ['$book.genre', 'Sin género'] } }
                }
              }
            ],
            as: 'activity'
          }
        },
        {
          $addFields: {
            activity: {
              $ifNull: [
                { $arrayElemAt: ['$activity', 0] },
                { totalLoans: 0, overdueLoans: 0, returnedLoans: 0, genres: [] }
              ]
            }
          }
        },
        {
          $addFields: {
            segment: {
              $switch: {
                branches: [
                  { case: { $eq: ['$activity.totalLoans', 0] }, then: 'Sin préstamos' },
                  { case: { $eq: ['$activity.totalLoans', 1] }, then: 'Un solo préstamo' },
                  { case: { $lte: ['$activity.totalLoans', 4] }, then: 'Recurrente' }
                ],
                default: 'Frecuente'
              }
            },
            hasOverdue: { $gt: ['$activity.overdueLoans', 0] },
            genreDiversity: { $size: '$activity.genres' }
          }
        },
        {
          $group: {
            _id: '$segment',
            userCount: { $sum: 1 },
            averageLoans: { $avg: '$activity.totalLoans' },
            usersWithOverdue: { $sum: { $cond: ['$hasOverdue', 1, 0] } },
            averageGenreDiversity: { $avg: '$genreDiversity' }
          }
        },
        {
          $project: {
            _id: 0,
            segment: '$_id',
            userCount: 1,
            averageLoans: { $round: ['$averageLoans', 2] },
            usersWithOverdue: 1,
            averageGenreDiversity: { $round: ['$averageGenreDiversity', 2] }
          }
        },
        { $sort: { userCount: -1, segment: 1 } }
      ]),

      miguelReturnEfficiency: () => aggregate(models.Loan, [
        { $match: { status: 'returned', returnDate: { $type: 'date' }, dueDate: { $type: 'date' } } },
        { $lookup: { from: 'copies', localField: 'copy', foreignField: '_id', as: 'copy' } },
        { $unwind: '$copy' },
        { $lookup: { from: 'books', localField: 'copy.book', foreignField: '_id', as: 'book' } },
        { $unwind: '$book' },
        {
          $addFields: {
            loanDays: { $dateDiff: { startDate: '$loanDate', endDate: '$returnDate', unit: 'day' } },
            daysLate: {
              $cond: [
                { $gt: ['$returnDate', '$dueDate'] },
                { $dateDiff: { startDate: '$dueDate', endDate: '$returnDate', unit: 'day' } },
                null
              ]
            }
          }
        },
        {
          $group: {
            _id: { $ifNull: ['$book.genre', 'Sin género'] },
            returnedLoans: { $sum: 1 },
            onTimeReturns: { $sum: { $cond: [{ $lte: ['$returnDate', '$dueDate'] }, 1, 0] } },
            lateReturns: { $sum: { $cond: [{ $gt: ['$returnDate', '$dueDate'] }, 1, 0] } },
            averageLoanDays: { $avg: '$loanDays' },
            averageDaysLate: { $avg: '$daysLate' },
            borrowers: { $addToSet: '$user' }
          }
        },
        {
          $project: {
            _id: 0,
            genre: '$_id',
            returnedLoans: 1,
            onTimeReturns: 1,
            lateReturns: 1,
            onTimeRatePct: percent('$onTimeReturns', '$returnedLoans'),
            averageLoanDays: { $round: ['$averageLoanDays', 1] },
            averageDaysLate: { $round: ['$averageDaysLate', 1] },
            distinctBorrowers: { $size: '$borrowers' }
          }
        },
        { $sort: { onTimeRatePct: 1, returnedLoans: -1, genre: 1 } }
      ])
    }
  };
}

function dateStringValue(date) {
  return date.toISOString();
}

module.exports = { typeDefs, createAdvancedResolvers };
