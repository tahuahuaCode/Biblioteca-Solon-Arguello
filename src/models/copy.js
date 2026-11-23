const mongoose = require('mongoose');

const copySchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    inventoryCode: { type: String, required: true, trim: true, unique: true },
    status: {
      type: String,
      enum: ['available', 'loaned', 'maintenance'],
      default: 'available'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Copy || mongoose.model('Copy', copySchema);
