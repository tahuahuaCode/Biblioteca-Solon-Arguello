const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    isbn: { type: String, required: true, trim: true, unique: true },
    publishedYear: { type: Number, min: 0 },
    genre: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Book || mongoose.model('Book', bookSchema);
