"use strict";

const config = require("../../server/config.local");
const fs = require("fs");
const utils = require("./utils");

const path = "./server/doiconfig.local.json";

function formRegistrationXML(publishedData) {
  const {
    affiliation,
    publisher,
    publicationYear,
    title,
    abstract,
    resourceType,
    creator,
  } = publishedData;
  const doi = publishedData["doi"];
  const uniqueCreator = creator.filter(
    (author, i) => creator.indexOf(author) === i
  );

  const creatorElements = uniqueCreator.map((author) => {
    const names = author.split(" ");
    const firstName = names[0];
    const lastName = names.slice(1).join(" ");

    return `
            <creator>
                <creatorName>${lastName}, ${firstName}</creatorName>
                <givenName>${firstName}</givenName>
                <familyName>${lastName}</familyName>
                <affiliation>${affiliation}</affiliation>
            </creator>
        `;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
        <resource xmlns="http://datacite.org/schema/kernel-4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://datacite.org/schema/kernel-4 http://schema.datacite.org/meta/kernel-4/metadata.xsd">
            <identifier identifierType="doi">${doi}</identifier>
            <creators>
                ${creatorElements.join("\n")}
            </creators>
            <titles>
                <title>${title}</title>
            </titles>
            <publisher>${publisher}</publisher>
            <publicationYear>${publicationYear}</publicationYear>
            <descriptions>
                <description xml:lang="en-us" descriptionType="Abstract">${abstract}</description>
            </descriptions>
            <resourceType resourceTypeGeneral="Dataset">${resourceType}</resourceType>
        </resource>
    `;
}

module.exports = function (PublishedData) {
  const app = require("../../server/server");

  PublishedData.observe("before save", function (ctx, next) {
    const User = app.models.User;
    if (ctx.instance) {
      if (ctx.isNewInstance) {
        ctx.instance.doi = config.doiPrefix + "/" + ctx.instance.doi;
        ctx.instance.status = "pending_registration";
        // console.log("      New pid:", ctx.instance.doi);
      }
      if (ctx.options.accessToken) {
        User.findById(ctx.options.accessToken.userId, function (
          err,
          instance
        ) {
          if (instance) {
            if (ctx.instance.createdBy) {
              ctx.instance.updatedBy = instance.username;
            } else {
              ctx.instance.createdBy = instance.username;
            }
          } else {
            if (ctx.instance.createdBy) {
              ctx.instance.updatedBy = "anonymous";
            } else {
              ctx.instance.createdBy = "anonymous";
            }
          }
          next();
        });
      } else {
        if (ctx.instance.createdBy) {
          ctx.instance.updatedBy = "anonymous";
        } else {
          ctx.instance.createdBy = "anonymous";
        }
        next();
      }
    } else if (ctx.data) {
      if (ctx.options.accessToken) {
        User.findById(ctx.options.accessToken.userId, function (
          err,
          instance
        ) {
          if (instance) {
            ctx.data.updatedBy = instance.username;
          } else {
            ctx.data.updatedBy = "anonymous";
          }
          next();
        });
      } else {
        ctx.data.updatedBy = "anonymous";
        next();
      }
    }
  });

  PublishedData.formPopulate = function (pid, next) {
    var Dataset = app.models.Dataset;
    var Proposal = app.models.Proposal;
    var self = this;
    self.formData = {};

    Dataset.findById(pid, function (err, ds) {
      if (err) {
        return next(err);
      }
      const proposalId = ds.proposalId;
      self.formData.resourceType = ds.type;
      self.formData.description = ds.description;
      //self.formData.sizeOfArchive = ds.size;

      Proposal.findById(proposalId, function (err, prop) {
        if (prop) {
          self.formData.title = prop.title;
          self.formData.abstract = prop.abstract;
        }
        Dataset.thumbnail(pid).then((thumb) => {
          self.formData.thumbnail = thumb;
          return next(null, self.formData);
        });
      });
    });
  };

  PublishedData.remoteMethod("formPopulate", {
    accepts: [
      {
        arg: "pid",
        type: "string",
        required: true,
      },
    ],
    http: {
      path: "/formPopulate",
      verb: "get",
    },
    returns: {
      type: "Object",
      root: true,
    },
  });

  PublishedData.register = function (id, cb) {
    const where = {
      _id: id,
    };

    PublishedData.findById(id, function (err, pub) {
      const data = {
        status: "registered",
        registeredTime: new Date(),
      };
      pub.registeredTime = data.registeredTime;
      pub.status = data.status;

      const xml = formRegistrationXML(pub);

      if (!config) {
        return cb("No config.local");
      }

      var Dataset = app.models.Dataset;
      pub.pidArray.forEach(function (pid) {
        const whereDS = { pid: pid };
        Dataset.update(
          whereDS,
          {
            isPublished: true,
            datasetlifecycle: { publishedOn: data.registeredTime },
          },
          function (err) {
            if (err) {
              return cb(err);
            }
          }
        );
      });

      const fullDoi = pub.doi;
      const registerMetadataUri = `${config.registerMetadataUri}/${fullDoi}`;
      const registerDoiUri = `${config.registerDoiUri}/${fullDoi}`;
      const OAIServerUri = config.oaiProviderRoute;

      let doiProviderCredentials = {
        username: "removed",
        password: "removed",
      };
      if (fs.existsSync(path)) {
        doiProviderCredentials = JSON.parse(fs.readFileSync(path));
      }
      const registerDataciteMetadataOptions = {
        method: "PUT",
        body: xml,
        uri: registerMetadataUri,
        headers: {
          "content-type": "application/xml;charset=UTF-8",
        },
        auth: doiProviderCredentials,
      };
      const encodeDoi = encodeURIComponent(encodeURIComponent(fullDoi));  //Needed to make sure that the "/" between DOI prefix and ID stays encoded in datacite
      const registerDataciteDoiOptions = {
        method: "PUT",
        body: [
          "#Content-Type:text/plain;charset=UTF-8",
          `doi= ${fullDoi}`,
          `url= ${config.publicURLprefix}${encodeDoi}`,
        ].join("\n"),
        uri: registerDoiUri,
        headers: {
          "content-type": "text/plain;charset=UTF-8",
        },
        auth: doiProviderCredentials,
      };

      const syncOAIPublication = {
        method: "POST",
        body: pub.toJSON(),
        json: true,
        uri: OAIServerUri,
        headers: {
          "content-type": "application/json;charset=UTF-8",
        },
        auth: doiProviderCredentials,
      };
      if (config.site !== "PSI") {
        console.log("posting to datacite");
        console.log(registerDataciteMetadataOptions);
        console.log(registerDataciteDoiOptions);

        (async () => {
          let res;
          try {
            res = await utils.superagent(registerDataciteMetadataOptions);
          } catch (err1) {
            console.error("ERROR REGISTERING METADATA", err1);
            return cb(err1);
          }
          try {
            await utils.superagent(registerDataciteDoiOptions);
          } catch (err2) {
            console.error("ERROR REGISTERING DOI", err2);
            return cb(err2);
          }

          try {
            PublishedData.update(where, data, function (err) {
              if (err) {
                return cb(err);
              }
            });
          } catch (err3) {
            console.error("ERROR UPDATING PUBLISHED DATA", err3);
            return cb(err3);
          }
          return cb(null, res);
        })();

      } else if (!config.oaiProviderRoute) {
        PublishedData.update(where, { $set: data }, function (err) {
          if (err) {
            return cb(err);
          }
        });
        return cb(
          null, "results not pushed to oaiProvider as oaiProviderRoute route is not specified in config.local"
        );
      } else {

        (async () => {
          try {
            const res = await utils.superagent(syncOAIPublication);
            PublishedData.update(where, { $set: data }, function (err) {
              if (err) {
                return cb(err);
              }
            });

            return cb(null, res);

          } catch (error) {
            return cb(error);
          }
        })();
      }
    });
  };

  PublishedData.remoteMethod("register", {
    accepts: [
      {
        arg: "id",
        type: "string",
        required: true,
      },
    ],
    http: {
      path: "/:id/register",
      verb: "post",
    },
    returns: {
      arg: "doi",
      type: "string",
    },
  });

  PublishedData.resync = function (doi, data, cb) {
    if (!config) {
      return cb("No config.local");
    }
    delete data.doi;
    delete data._id;
    const OAIServerUri = config.oaiProviderRoute;
    let doiProviderCredentials = {
      username: "removed",
      password: "removed",
    };

    const resyncOAIPublication = {
      method: "PUT",
      body: data,
      json: true,
      uri:
        OAIServerUri +
        "/" +
        encodeURIComponent(encodeURIComponent(doi)),
      headers: {
        "content-type": "application/json;charset=UTF-8",
      },
      auth: doiProviderCredentials,
    };

    const where = {
      doi: doi,
    };

    (async () => {
      try {
        const res = await utils.superagent(resyncOAIPublication);

        PublishedData.update(where, { $set: data }, function (err) {
          if (err) {
            return cb(err);
          }
        });

        return cb(null, res);

      } catch (error) {
        return cb(error);
      }
    })();
  };

  PublishedData.remoteMethod("resync", {
    accepts: [
      {
        arg: "id",
        type: "string",
        required: true,
      },
      {
        arg: "data",
        type: "object",
        required: true,
        http: { source: "body" },
      },
    ],
    http: {
      path: "/:id/resync",
      verb: "post",
    },
    returns: {
      arg: "doi",
      type: "string",
    },
  });

  PublishedData.beforeRemote("find", function (ctx, unused, next) {
    const filter = addRegisteredIfUnathenticated(ctx, ctx.args.filter);
    if (filter) ctx.args.filter = filter;
    next();
  });

  // TODO add logic that give authors privileges to modify data

  // // put
  // PublishedData.beforeRemote('replaceOrCreate', function(ctx, instance, next) {
  //     // convert base64 image
  //
  //     next();
  // });
  //
  // //patch
  // PublishedData.beforeRemote('patchOrCreate', function(ctx, instance, next) {
  //     next();
  // });

  PublishedData.beforeRemote("count", function (ctx, unused, next) {
    const filter = addRegisteredIfUnathenticated(ctx, ctx.args);
    if (filter) ctx.args.where = filter.where;
    next();
  });
};

function addRegisteredIfUnathenticated(ctx, filterField) {
  const filterClone = filterField? JSON.parse(JSON.stringify(filterField)): undefined;
  const accessToken = ctx.args.options.accessToken;
  if (!accessToken) {
    let filter = {};
    if (filterClone) {
      if (filterClone.where) {
        filter.where = {};
        if (filterClone.where.and) {
          filter.where.and = [];
          filter.where.and.push({ status: "registered" });
          filter.where.and = filter.where.and.concat(
            filterClone.where.and
          );
        } else if (filterClone.or) {
          filter.where.and = [];
          filter.where.and.push({ status: "registered" });
          filter.where.and.push({ or: filterClone.where.or });
        } else {
          filter.where = {
            and: [{ status: "registered" }].concat(
              filterClone.where
            ),
          };
        }
      } else {
        filter.where = { status: "registered" };
      }
      if (filterClone.skip) {
        filter.skip = filterClone.skip;
      }
      if (filterClone.limit) {
        filter.limit = filterClone.limit;
      }
      if (filterClone.include) {
        filter.include = filterClone.include;
      }
      if (filterClone.fields) {
        filter.fields = filterClone.fields;
      }
    } else {
      filter = { where: { status: "registered" } };
    }
    return filter;
  }
}

