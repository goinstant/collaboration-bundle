/*jshint browser:true*/
/*global module, require*/
'use strict';

var Uri = require('../node_modules/jsuri/Uri');

var inviteUrl = module.exports;

var ANCHOR_NAME = 'gi-cb-sess';

inviteUrl.generate = function(sessionId) {
  var uri = new Uri(inviteUrl._getLocation());
  var sessIdPart = ANCHOR_NAME + '=' + sessionId;

  var anchor;
  if (uri.anchor()) {
    anchor = uri.anchor() + '&' + sessIdPart;
  } else {
    anchor = sessIdPart;
  }

  uri.setAnchor(anchor);

  return uri.toString();
};

inviteUrl.retrieve = function() {
  var uri = new Uri(inviteUrl._getLocation());
  var anchor = uri.anchor();
  if (!anchor) {
    return null;
  }

  var regex = new RegExp(ANCHOR_NAME + '=' + '([0-9a-f\\-]{36})');

  var match = anchor.match(regex);
  if (!match) {
    return null;
  }

  return match[1];
};

inviteUrl._getLocation = function() {
  return window.location.href;
};
