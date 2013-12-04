/* jshint browser:true */
/* global module, goinstant, require */
'use strict';

var async = require('async');
var _ = require('lodash');

var Uri = require('../node_modules/jsuri/Uri');

var KEY_NAMESPACE = '/goinstant/widgets/url-follow';

module.exports = UrlFollower;

function UrlFollower(room) {
  if (!room || typeof room != 'object') {
    throw new Error('URLFollow: Room object not found or invalid');
  }

  // Options stored
  this._room = room;
  this._namespace = room.key(KEY_NAMESPACE);

  // Room Detail Keys
  this._roomLocationKey = this._namespace.key('url');
  this._roomVersionKey = this._namespace.key('version');

  this._userVersionKey = null;

  this.followData = null;
  this.followUser = null;

  this._isInitialized = false;

  _.bindAll(
    this,
    '_onSet'
  );
}

UrlFollower.prototype.initialize = function(cb) {
  var self = this;

  // Validate that callback is a function
  if (typeof cb != 'function') {
    throw new Error('URLFollow: A callback function must be passed');
  }

  if (this._isInitialized === true) {
    throw new Error('URLFollow: Widget is already initialized');
  }

  var userKey = self._room.self();
  var tasks = {
    user: _.bind(userKey.get, userKey),
    data: _.bind(self._namespace.get, self._namespace)
  };

  async.parallel(tasks, function(err, result) {
    if (err) {
      return cb(err);
    }

    self.followData = result.data[0];
    self.followUser = result.user[0];

    self._setup();

    try {
      self._validate();
    } catch (validationErr) {
      return cb(validationErr);
    }

    var widgetUserKey = self._namespace.key(self.followUser.id);
    self._userVersionKey = widgetUserKey.key('version');

    var roomVersion = self.followData.version;
    var userVersion = self.followData[self.followUser.id].version;

    var roomUrl = self.followData.url[roomVersion];

    if (self._isCrossDomain(roomUrl)) {
      return cb(new Error('URLFollow: Cross-Domain Initialization Denied'));
    }

    // If the user version is the same as room version on load, they
    // navigated independently and are the leader
    if (roomVersion == userVersion) {
      self._lead(cb);
    } else {
      self._follow(cb);
    }
  });
};

UrlFollower.prototype.destroy = function(cb) {
  if (!this._isInitialized) {
    throw new Error('URLFollow: Widget is not yet initialized');
  }

  this._roomVersionKey.off('set');
  this._isInitialized = false;

  return cb();
};

UrlFollower.prototype.getRoomVersion = function() {
  if (!this._isInitialized) {
    throw new Error('URLFollow: Widget is not yet initialized');
  }

  return this.followData.version;
};

UrlFollower.prototype._validate = function() {
  var user = this.followUser;

  // Check that you have a user id
  if (!(user && user.id)) {
    throw new Error('URLFollow: Error occurred during widget initialization');
  }
};

/**
 *  Sets up the data object if it's the first use of
 *  the widget on this room/namespace.
 */
UrlFollower.prototype._setup = function() {
  var data = this.followData;
  var user = this.followUser;

  data = data || {};

  data.version = data.version || 0;

  data.url = data.url || { 0: this._getDocumentLocation() };

  if (user && user.id && !data[user.id]) {
    data[user.id] = { version: 0 };
  } else if (user && user.id && !data[user.id].version) {
    data[user.id].version = 0;
  }

  this.followData = data;
  this.followUser = user;
};

UrlFollower.prototype._lead = function(cb) {
  var self = this;
  self.followData.version++;
  var newVersion = self.followData.version;
  var data = this.followData;
  var user = this.followUser;

  var location = document.location.href;
  var versionKey = self._roomLocationKey.key(newVersion.toString());
  // Update the room location for the new version, and lock
  versionKey.set(location, { overwrite: false }, function(err, val, ctx) {

    // CollisionError means you lost on a race condition
    if (err instanceof goinstant.errors.CollisionError) {
      if (ctx.userId !== user.id) {
        // Have to follow room
        self._setDocumentLocation(data.url[data.version]);
        return cb();
      }
    } else if (err) {
      return cb(err);
    }

    // Set the room version and your version to be equal
    self._roomVersionKey.set(newVersion, function(err) {
      if (err) {
        return cb(err);
      }

      self._userVersionKey.set(newVersion, function(err) {
        if (err) {
          return cb(err);
        }

        self._bindOnSet(); // Listen for changes to the room version
        self._isInitialized = true;
        cb();
      });
    });
  });
};

UrlFollower.prototype._follow = function(cb) {
  var self = this;
  var data = this.followData;

  // If they're at the right URL for the room, update to this version
  if (self._getDocumentLocation() !== data.url[data.version]) {
    self._setDocumentLocation(data.url[data.version]);

    self._isInitialized = true;

    return cb();
  }

  self._userVersionKey.set(data.version, function(err) {
    if (err) {
      return cb(err);
    }

    self._bindOnSet(); // Listen for changes to the room version

    self._isInitialized = true;

    cb();
  });
};

UrlFollower.prototype._bindOnSet = function() {
  this._roomVersionKey.on('set', this._onSet);
};

UrlFollower.prototype._onSet = function(roomVersion, ctx) {
  var self = this;
  var user = this.followUser;

  if (ctx.userId == user.id) {
    return;
  }

  self._roomLocationKey.key(''+roomVersion).get(function(err, roomUrl) {
    if (err) {
      throw err;
    }

    if (self._isCrossDomain(roomUrl)) {
      throw new Error('URLFollow: Unauthorized Cross-Domain Request Made');
    }

    if (roomUrl === self._getDocumentLocation()) { // If it's the same URL
      self._refreshDocumentLocation();               // Reload
    } else {
      self._setDocumentLocation(roomUrl);          // Else Navigate
    }
  });
};

UrlFollower.prototype._setDocumentLocation = function(url) {
  document.location = url;
};

UrlFollower.prototype._getDocumentLocation = function() {
  return document.location.href;
};

UrlFollower.prototype._refreshDocumentLocation = function() {
  location.reload();
};

UrlFollower.prototype._isCrossDomain = function(url) {
  var currentUrl = new Uri(this._getDocumentLocation());
  var platformUrl = new Uri(url);

  var samePort = currentUrl.port() === platformUrl.port();
  var sameHost = currentUrl.host() === platformUrl.host();
  var sameProtocol = currentUrl.protocol() === platformUrl.protocol();

  return !(samePort && sameHost && sameProtocol);
};
