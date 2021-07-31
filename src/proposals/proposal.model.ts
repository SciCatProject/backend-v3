//const mongoose = require("mongoose");

var ProposalSchema = new mongoose.Schema({
});

var ProposalModel = mongoose.model(
  "Proposals",
  new ProposalSchema
);

module.exports = {ProposalSchema, ProposalModel};