"use strict";

// process.env.NODE_ENV = 'test';

var chai = require("chai");
var inputOrderChanger = require("../server/boot/oidcCompatibleStrategy")._changeVerifyInputOrder;


describe("Check that the verify decorator changes the input order in the function signature", () => {
  
  it("should change the input order", function() {
    const dummyFunction = function(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
      return [a0,a1,a2,a3,a4,a5,a6,a7,a8,a9];
    };
    chai.expect(inputOrderChanger(dummyFunction)(0,1,2,3,4,5,6,7,8,9)).to.be.eql([0,1,3,2,5,6,7,8,9,4]);
  });
});
