const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    createdAt: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('transaction', transactionSchema);
module.exports = Transaction;