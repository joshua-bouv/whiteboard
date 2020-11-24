let mongoose = require('mongoose');

let lineSchema = new mongoose.Schema({
    drawer: {type: String}
})

module.exports = mongoose.model('Line', lineSchema)