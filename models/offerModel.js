const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    offerName: {
        type: String,
        required: true
    },
    discountPercentage: {
        type: Number,
        required: true
    },
    offerType: {
        type: String,
        enum: ['category', 'product'],
        required: true
    },
    selectItem: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: function(){
            return this.offerType === 'category'? 'Category' : 'Product';
        }
    },
    expiryDate: {
        type: Date,
        required: true
    },
    status: {
        type: Boolean,
        default: true,
        required: false
    }
},{
    timestamps: true
});

module.exports = mongoose.model('Offer', offerSchema);