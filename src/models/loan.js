const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    copy: { type: mongoose.Schema.Types.ObjectId, ref: 'Copy', required: true },
    loanDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    returnDate: { type: Date, default: null },
    status: { type: String, enum: ['active', 'returned', 'overdue'], default: 'active' }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Loan || mongoose.model('Loan', loanSchema);
