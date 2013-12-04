/*jshint browser:true*/
/*global module, require*/
'use strict';

var cookie = require('cookie');
var uuid = require('uuid');

var COOKIE_NAME = 'goinstant-collaboration-bundle-session';

module.exports = SessionCookie;

function SessionCookie() {
}

SessionCookie.cookie = cookie;

SessionCookie.prototype.get = function() {
  return SessionCookie.cookie(COOKIE_NAME);
};

SessionCookie.prototype.set = function(sessId) {
  SessionCookie.cookie(COOKIE_NAME, sessId);
};

SessionCookie.prototype.destroy = function() {
  return SessionCookie.cookie(COOKIE_NAME, null);
};

SessionCookie.prototype.create = function() {
  if (this.isSet()) {
    throw new Error('Should not create session cookie when already set');
  }

  var id = uuid();

  SessionCookie.cookie(COOKIE_NAME, id);

  return id;
};

SessionCookie.prototype.isSet = function() {
  return !!this.get();
};
