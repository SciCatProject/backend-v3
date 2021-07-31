var TechniqueSchema = new mongoose.Schema({
  name: {
    type: "string",
    required: true,
    description: "The name of the technique"
  }
});

var TechniqueModel = mongoose.model(
  "Techniques",
  new TechniqueSchema
);

module.exports = {TechniqueSchema, TechniqueModel};

