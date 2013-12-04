/*jshint browser:true*/
/*global module, require*/
'use strict';

var cookie = require('cookie');

var COOKIE_NAME = 'goinstant-collaboration-bundle-collapse';

module.exports = CollapseCookie;

function CollapseCookie() {
}

CollapseCookie.cookie = cookie;

CollapseCookie.prototype.get = function() {
  return CollapseCookie.cookie(COOKIE_NAME);
};

CollapseCookie.prototype.set = function(value) {
  CollapseCookie.cookie(COOKIE_NAME, value);
};

CollapseCookie.prototype.destroy = function() {
  return CollapseCookie.cookie(COOKIE_NAME, null);
};

CollapseCookie.prototype.create = function() {
  if (this.isSet()) {
    throw new Error('Should not create session cookie when already set');
  }

  var currentStatus = 'open';

  CollapseCookie.cookie(COOKIE_NAME, currentStatus);

  return currentStatus;
};

CollapseCookie.prototype.isSet = function() {
  return !!this.get();
};
