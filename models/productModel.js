const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  is_listed: {
    type: Boolean,
    default: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  stock: {
    type: Number,
    required: true
  },
  images: [String],
  offers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer'
  }]
},{
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
