//const mongoose = require("mongoose");

var InstrumentSchema = new mongoose.Schema({
});

var InstrumentModel = mongoose.model(
  "Instruments",
  new InstrumentSchema
);

module.exports = {InstrumentSchema, InstrumentModel};