"use strict";

var chai = require("chai");
var should = chai.should();
var validations = require("../server/boot/validations");


describe("validations.idsHaveDuplicates", function () {
  context("with string IDs", function () {
    it("should be true with a duplicate present", function () {
      validations.idsHaveDuplicates(["a", "b", "a"]).should.be.ok;
    });

    it("should be false when no duplicates are present", function () {
      validations.idsHaveDuplicates(["a", "b", "c"]).should.not.be.ok;
    });
  });

  context("with numeric IDs", function () {
    it("should be true with a duplicate present", function () {
      validations.idsHaveDuplicates([1, 2, 1]).should.be.ok;
    });

    it("should be false when no duplicates are present", function () {
      validations.idsHaveDuplicates([1, 2, 3]).should.not.be.ok;
    });
  });

  context("with complex IDs", function () {
    it("should be true with a duplicate present", function () {
      validations.idsHaveDuplicates(["a", "b", "a"].map(id => ({ id }))).should.be.ok;
    });

    it("should be false when no duplicates are present", function () {
      validations.idsHaveDuplicates(["a", "b", "c"].map(id => ({ id }))).should.not.be.ok;
    });
  });
});

const modelToMock = { dataSource: { idName: () => undefined } };
describe("validations.efficientUniqueness", function () {
  const propertyName = "techniques";
  const idName = "id";
  const tests = [
    {
      args: [{ [idName]: 1 }, { [idName]: 1 }],
      expected: [
        propertyName,
        "contains duplicate `" + idName + "`",
        "efficientUniqueness"
      ],
      message: "with duplicates"
    },
    {
      args: [{ [idName]: 1 }, { [idName]: 2 }],
      expected: [],
      message: "without duplicates"
    }];
  tests.forEach(({ args, expected, message }) => {
    context(`${message}`, function () {
      it(`should return an error ${message} present`, function () {
        const out = [];
        const modelFromMock = {
          [propertyName]: args,
          errors: {
            add: (name, message, code) => out.push(name, message, code)
          }
        };
        validations.efficientUniqueness(
          propertyName,
          modelToMock).call(
          modelFromMock, () => undefined);
        out.should.eql(expected);
      });
    });
  });
});

describe("validations.sanitazeUniqueness", function () {
  context("replaces in the validations list the uniqueness function", function () {
    it("should replace the uniqueness function", function () {
      const modelsMock = {
        model1: {
          relations: {
            model2: {
              type: "embedsMany",
              keyFrom: "model2",
              modelTo: modelToMock
            }
          },
          validations: { model2: [{ code: "uniqueness" }] },
          validate: (name, func, code) => modelsMock.model1.validations.model2.push(code)
        }
      };
      validations.sanitazeUniqueness(modelsMock);
      modelsMock.model1.validations.model2.should.eql(
        [{ code: validations.efficientUniqueness.name }]
      );
    });
  });
});
