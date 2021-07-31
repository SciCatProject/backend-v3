const mongoose = require("mongoose");

// Dataset model
var DatasetSchema = new mongoose.Schema({
    owner: { 
        type:"string", 
        required: true, 
        index: true,
        description: "Owner or custodian of the data set, usually first name + lastname. The string may contain a list of persons, which should then be seperated by semicolons."
    },
    ownerEmail: {
        type: "string",
        description: "Email of owner or of custodian of the data set. The string may contain a list of emails, which should then be seperated by semicolons."
    },
    orcidOfOwner: {
        type: "string",
        description: "ORCID of owner/custodian. The string may contain a list of ORCID, which should then be separated by semicolons."
    },
    contactEmail: {
        type: "string",
        required: true,
        index: true,
        description: "Email of contact person for this dataset. The string may contain a list of emails, which should then be seperated by semicolons."
    },
    sourceFolder: {
        type: "string",
        required: true,
        index: true,
        description: "Absolute file path on file server containing the files of this dataset, e.g. /some/path/to/sourcefolder. In case of a single file dataset, e.g. HDF5 data, it contains the path up to, but excluding the filename. Trailing slashes are removed."
    },
    sourceFolderHost: {
        type: "string",
        required: false,
        index: true,
        description: "DNS host name of file server hosting sourceFolder, optionally including protocol e.g. [protocol://]fileserver1.example.com"
    },
    size: {
        type: "number",
        index: true,
        description: "Total size of all source files contained in source folder on disk when unpacked"
    },
    packedSize: {
        type: "number",
        description: "Total size of all datablock package files created for this dataset"
    },
    numberOfFiles: {
        type: "number",
        description: "Total number of lines in filelisting of all OrigDatablocks for this dataset"
    },
    numberOfFilesArchived: {
        type: "number",
        description: "Total number of lines in filelisting of all Datablocks for this dataset"
    },
    creationTime: {
        type: "date",
        required: true,
        index: true,
        description: "Time when dataset became fully available on disk, i.e. all containing files have been written. Format according to chapter 5.6 internet date/time format in RFC 3339. Local times without timezone/offset info are automatically transformed to UTC using the timezone of the API server."
    },
    type: {
        type: "string",
        required: true,
        index: true,
        description: "Characterize type of dataset, either 'base' or 'raw' or 'derived'. Autofilled when choosing the proper inherited models"
    },
    validationStatus: {
        type: "string",
        description: "Defines a level of trust, e.g. a measure of how much data was verified or used by other persons"
    },
    keywords: {
        type: ["string"],
        description: "Array of tags associated with the meaning or contents of this dataset. Values should ideally come from defined vocabularies, taxonomies, ontologies or knowledge graphs"
    },
    description: {
        type: "string",
        description: "Free text explanation of contents of dataset"
    },
    datasetName: {
        type: "string",
        description: "A name for the dataset, given by the creator to carry some semantic meaning. Useful for display purposes e.g. instead of displaying the pid. Will be autofilled if missing using info from sourceFolder"
    },
    classification: {
        type: "string",
        description: "ACIA information about AUthenticity,COnfidentiality,INtegrity and AVailability requirements of dataset. E.g. AV(ailabilty)=medium could trigger the creation of a two tape copies. Format 'AV=medium,CO=low'"
    },
    license: {
        type: "string",
        description: "Name of license under which data can be used"
    },
    version: {
        type: "string",
        description: "Version of API used in creation of dataset"
    },
    isPublished: {
        type: "boolean",
        description: "Flag is true when data are made publically available"
    },
    history: mongoose.Schema.Types.Mixed,
    datasetlifecycle: DatasetLifecycleSchema,
    techniques: [TechniqueSchema],
    sampleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SampleSchema"
    },
    instrumentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InstrumentSchema"
    },
    proposalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProposalSchema"
    }
});

var DatasetModel = mongoose.model(
  "Dataset",
  new DatasetSchema
);

module.exports = {DatasetSchema, DatasetModel};
