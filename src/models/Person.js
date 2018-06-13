const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Person = new Schema({
    name: String,
    creator: String
});
  
module.exports = mongoose.model('Person', Person);