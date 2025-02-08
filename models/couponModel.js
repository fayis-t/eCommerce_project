const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    percentage: {
        type: Number,
        required: true,
        min: 1,
        max: 100
    },
    couponCode: {
        type: String,
        required: true
    },
    minimumAmount: {
        type: Number,
        required: true
    },
    maxredeemAmount: {
        type: Number,
        required: true
    },
    expires: {
        type: Date,
        required: true
    },
    status: {
        type: Boolean,
        default: true
    },
    userList: [{
        userId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        couponUsed:{
            type: Boolean,
            default: false
        }
    }]
},{
    timestamps: true
});

module.exports = mongoose.model('Coupon', couponSchema);
