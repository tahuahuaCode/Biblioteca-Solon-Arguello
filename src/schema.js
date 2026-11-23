const { gql } = require('graphql-tag');
const { GraphQLError } = require('graphql');
const mongoose = require('mongoose');
const Book = require('./models/book');
const User = require('./models/user');
const Copy = require('./models/copy');
const Loan = require('./models/loan');
const { typeDefs: analyticsTypeDefs, createAnalyticsResolvers } = require('./analytics');
const {
  typeDefs: advancedAnalyticsTypeDefs,
  createAdvancedResolvers
} = require('./advanced-analytics');
const {
  typeDefs: libraryOperationsTypeDefs,
  createLibraryResolvers
} = require('./library-operations');

const baseTypeDefs = gql`
  type Book {
    id: ID!
    title: String!
    author: String!
    isbn: String!
    publishedYear: Int
    genre: String
  }

  type User {
    id: ID!
    fullName: String!
    email: String!
    phone: String
  }

  input BookInput {
    title: String!
    author: String!
    isbn: String!
    publishedYear: Int
    genre: String
  }

  input BookUpdateInput {
    title: String
    author: String
    isbn: String
    publishedYear: Int
    genre: String
  }

  input UserInput {
    fullName: String!
    email: String!
    phone: String
  }

  input UserUpdateInput {
    fullName: String
    email: String
    phone: String
  }

  type Query {
    books: [Book!]!
    book(id: ID!): Book
    users: [User!]!
    user(id: ID!): User
  }

  type Mutation {
    createBook(input: BookInput!): Book!
    updateBook(id: ID!, input: BookUpdateInput!): Book
    deleteBook(id: ID!): Book
    createUser(input: UserInput!): User!
    updateUser(id: ID!, input: UserUpdateInput!): User
    deleteUser(id: ID!): User
  }
`;

const typeDefs = gql`
  ${baseTypeDefs}
  ${analyticsTypeDefs}
  ${advancedAnalyticsTypeDefs}
  ${libraryOperationsTypeDefs}
`;

function validateId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new GraphQLError('El identificador no es válido.', {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }
}

function validateUpdate(input) {
  if (!Object.keys(input).length) {
    throw new GraphQLError('Indica al menos un campo para actualizar.', {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }
}

function createResolvers(models = { Book, User, Copy, Loan }, options = {}) {
  const analyticsResolvers = createAnalyticsResolvers(models);
  const advancedResolvers = createAdvancedResolvers(models);
  const libraryResolvers = createLibraryResolvers(models, options);
  return {
    Query: {
      ...analyticsResolvers.Query,
      ...advancedResolvers.Query,
      ...libraryResolvers.Query,
      books: async () => {
        return models.Book.find({}).sort({ title: 1 }).exec();
      },
      book: async (_, { id }) => {
        validateId(id);
        return models.Book.findById(id).exec();
      },
      users: async () => {
        return models.User.find({}).sort({ fullName: 1 }).exec();
      },
      user: async (_, { id }) => {
        validateId(id);
        return models.User.findById(id).exec();
      }
    },
    Mutation: {
      ...libraryResolvers.Mutation,
      createBook: async (_, { input }) => models.Book.create(input),
      updateBook: async (_, { id, input }) => {
        validateId(id);
        validateUpdate(input);
        return models.Book.findByIdAndUpdate(id, input, { new: true, runValidators: true }).exec();
      },
      deleteBook: async (_, { id }) => {
        validateId(id);
        return models.Book.findByIdAndDelete(id).exec();
      },
      createUser: async (_, { input }) => models.User.create(input),
      updateUser: async (_, { id, input }) => {
        validateId(id);
        validateUpdate(input);
        return models.User.findByIdAndUpdate(id, input, { new: true, runValidators: true }).exec();
      },
      deleteUser: async (_, { id }) => {
        validateId(id);
        return models.User.findByIdAndDelete(id).exec();
      }
    },
    Book: { id: (book) => book.id || book._id.toString() },
    PhysicalCopy: { id: (copy) => copy.id || copy._id.toString() },
    User: { id: (user) => user.id || user._id.toString() }
  };
}

module.exports = { typeDefs, createResolvers };
