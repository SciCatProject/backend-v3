"use strict";

var idEquals = require("loopback-datasource-juggler/lib/utils").idEquals;

exports.efficientUniqueness = efficientUniqueness;
exports.idsHaveDuplicates = idsHaveDuplicates;
exports.sanitazeUniqueness = sanitazeUniqueness;

/**
 * Check a list of IDs to see if there are any duplicates.
 *
 * @param {Array} The array of IDs to check
 * @returns {boolean} If any duplicates were found
 */
function idsHaveDuplicates(ids) {
  // use Set if available and all ids are of string or number type
  var hasDuplicates = undefined;
  var i, j;
  if (typeof Set === "function") {
    var uniqueIds = new Set();
    for (i = 0; i < ids.length; ++i) {
      var idType = typeof ids[i];
      if (idType === "string" || idType === "number") {
        if (uniqueIds.has(ids[i])) {
          hasDuplicates = true;
          break;
        } else {
          uniqueIds.add(ids[i]);
        }
      } else {
        // ids are not all string/number that can be checked via Set, stop and do the slow test
        break;
      }
    }
    if (hasDuplicates === undefined && uniqueIds.size === ids.length) {
      hasDuplicates = false;
    }
  }
  if (hasDuplicates === undefined) {
    // fast check was inconclusive or unavailable, do the slow check
    // can still optimize this by doing 1/2 N^2 instead of the full N^2
    for (i = 0; i < ids.length && hasDuplicates === undefined; ++i) {
      for (j = 0; j < i; ++j) {
        if (idEquals(ids[i], ids[j])) {
          hasDuplicates = true;
          break;
        }
      }
    }
  }
  return hasDuplicates === true;
}

/**
 * Check uniqueness of embedded model id.
 *
 * @param {string} propertyName Name of the embedded property 
 * @param {Object} modelTo embedded model
 */
function efficientUniqueness(propertyName, modelTo) {
  const idName = modelTo.dataSource.idName(modelTo.modelName) || "id";
  return function (err) {
    const embeddedList = this[propertyName] || [];
    const ids = embeddedList.map(
      function (m) {
        return m[idName] && m[idName].toString();
      }); // mongodb
    if (idsHaveDuplicates(ids)) {
      this.errors.add(
        propertyName,
        "contains duplicate `" + idName + "`",
        "efficientUniqueness"
      );
      err(false);
    }
  };
}

/**
 * Replace uniqueness check on embedded model id
 *
 * @param {Object} models Object containing the app models 
 */
function sanitazeUniqueness(models) {
  Object.values(models).forEach(model => {
    Object.values(model.relations).forEach(relation => {
      if (relation.type == "embedsMany" && !relation.polymorphic) {
        model.validate(
          relation.keyFrom,
          efficientUniqueness(relation.keyFrom, relation.modelTo),
          { code: efficientUniqueness.name }
        );
        model.validations[relation.keyFrom] = model.validations[relation.keyFrom].filter(
          k => k.code != "uniqueness"
        );
      }
    });
  });
}
