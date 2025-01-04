const mongoose = require('mongoose');
const schema = mongoose.Schema;

const addressSchema = new schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId, 
        required: true,
        ref: 'User'
    },
    name: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    pincode: {
        type: Number,
        required: true
    },
    mobile: {
        type: Number,
        required: true
    },
    },{
    timestamps: true
});

module.exports = mongoose.model('Address', addressSchema);