"use strict";

var OIDCStrategy = require("passport-openidconnect");

function _changeVerifyInputOrder(_verify) {
  return function(req, iss, uiProfile, idProfile, context, idToken, 
    accessToken, refreshToken, params, verified) {
    return _verify(req, iss, idProfile, uiProfile, idToken, 
      accessToken, refreshToken, params, verified, context);
  };
}

class Strategy extends OIDCStrategy {

  constructor(options, verify) {
    options.skipUserProfile = false;
    super(options, _changeVerifyInputOrder(verify));
  }
}

exports._changeVerifyInputOrder = _changeVerifyInputOrder;
exports.Strategy = Strategy;
