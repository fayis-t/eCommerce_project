const mongoose = require('mongoose');
const schema = mongoose.Schema;

const categorySchema = new schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    is_listed: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Category', categorySchema);