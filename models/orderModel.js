const mongoose = require('mongoose');

const generateOrderId = () => {
    return Math.floor(100000 + Math.random() * 900000);
}

const orderSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address'
    },
    payment_type: {
        type: String,
        required: true
    },
    payment_status: {
        type: String,
        required: true
    },
    order_status: {
        type: String,
        required: true
    },
    shipping_type: {
        type: String,
        required: true
    },
    products: [
        {
            productId: {
                type: mongoose.Schema.ObjectId,
                ref: 'Product'
            },
            quantity: {
                type: Number,
                required: true
            }
        }
    ],
    order_total: {
        type: Number,
        required: true
    },
    return_status: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now()
    },
    orderId: {
        type: Number,
        default: () => generateOrderId()
    }
},
    {
        timestamps: true
    });

    module.exports = mongoose.model('Order', orderSchema);