/*jshint browser:true*/
/*global module, require*/
'use strict';

module.exports = Bundle;

var classes = require('classes');
var prevent = require('prevent');
var async = require('async');
var _ = require('lodash');
var domready = require('domready');

var BUTTON_TEMPLATE = _.template(require('../templates/button.ejs.html'));

// For test stubbing
Bundle.debug = {
  UserColors: require('user-colors'),
  ScrollIndicator: require('scroll-indicator'),
  ClickIndicator: require('click-indicator'),
  FormManager: require('./form_manager'),
  UrlFollower: require('./url_follow'),
  SessionCookie: require('./session_cookie'),
  UserListWrapper: require('./user_list_wrapper'),
  CreateModal: require('./create_modal'),
  JoinModal: require('./join_modal'),
  events: require('events'),
  inviteUrl: require('./invite_url'),
  Chat: require('chat')
};

var STATES = {
  INITIAL: 'initial',
  BUTTON: 'button',
  WIDGETS: 'widgets'
};

function Bundle(opts) {
  if (!window.goinstant) {
    throw new Error(
      'The GoInstant Platform code could not be found. \n' +
      'Either it failed to load or the script was not included.'
    );
  }

  if (!opts) {
    throw new Error('Bundle must be passed an options object');
  }

  if (!opts.connectUrl) {
    throw new Error('Bundle options must include connectUrl');
  }

  this._connectUrl = opts.connectUrl;

  this._opts = opts;

  this._sessionCookie = new Bundle.debug.SessionCookie();

  this._reset();

  _.bindAll(
    this,
    [
      '_initializeVisual',
      '_initializeNonVisual',
      '_chooseUserColor',
      '_initializeUrlFollower',
      '_initializeUserListWrapper',
      '_initializeScrollIndicator',
      '_initializeClickIndicator',
      '_initializeFormManager',
      '_initializeChat'
    ]
  );
}

Bundle.prototype._reset = function() {
  this._connection = null;
  this._room = null;

  this._destroyables = [];

  this._userListWrapper = null;
  this._urlFollower = null;
  this._scrollIndicator = null;
  this._clickIndicator = null;
  this._formManager = null;
  this._chat = null;

  this._joinModal = null;
  this._createModal = null;

  this._state = STATES.INITIAL;
};

Bundle.prototype.initialize = function(cb) {
  var self = this;

  // Callback is optional
  cb = cb || function() {};

  var inviteSessionId = Bundle.debug.inviteUrl.retrieve();
  var cookieSessionId = this._sessionCookie.get();

  if (inviteSessionId) {
    // The invite URL takes precedence over cookies.

    this._sessionCookie.set(inviteSessionId);

    return domready(function() {
      self._requestJoinName(function(cancel, name) {

        // XXX: Handle destruction properly.
        // This should be in an intermediary destruction state until
        // platform has actually been initialized.
        // e.g. if destroy is called while a name modal is visible.
        self._state = STATES.WIDGETS;

        self._initializePlatform(inviteSessionId, name, cb);
      });
    });

  } else if (cookieSessionId) {
    // A cookie means we can just initialize all of the widgets.

    this._state = STATES.WIDGETS;

    self._initializePlatform(cookieSessionId, null, cb);

  } else {
    // No cookie or invite URL means the

    self._state = STATES.BUTTON;

    domready(function() {
      self._displayButton();

      return cb();
    });
  }
};

Bundle.prototype.destroy = function(cb) {
  var self = this;

  // XXX: PROPER VALIDATION PLZ
  cb = cb || function() {};

  if (self._state == STATES.BUTTON) {
    self._removeButton();
    return cb();

  } else if (self._state == STATES.WIDGETS) {
    self._sessionCookie.destroy();

    self._destroyWidgets(function(destroyErr) {
      self._room.leave(function(roomLeaveErr) {

        self._reset();
        self._displayButton();

        cb(destroyErr || roomLeaveErr);
      });
    });
  }
};

var BUTTON_CONTAINER_CLASS = 'gi-start-collaboration-bundle-container';

Bundle.prototype._displayButton = function() {
  var el = document.createElement('div');

  classes(el).add(BUTTON_CONTAINER_CLASS);

  el.innerHTML = BUTTON_TEMPLATE();

  document.body.appendChild(el);

  this._buttonEvents = Bundle.debug.events(el, this);
  this._buttonEvents.bind('click', '_startClick');

  this._el = el;
};

Bundle.prototype._removeButton = function() {
  this._buttonEvents.unbind();

  this._el.parentNode.removeChild(this._el);
};

Bundle.prototype._startClick = function(evt) {
  var self = this;
  prevent(evt);

  self._requestCreateName(function(canceled, name) {
    if (canceled) {
      return;
    }

    var sessionId = self._sessionCookie.create();

    self._removeButton();

    self._initializePlatform(sessionId, name, function(err) {
      if (err) {
        self._displayButton();

        // XXX display error to the user
        return;
      }

      self._state = STATES.WIDGETS;
    });
  });
};

Bundle.prototype._requestCreateName = function(cb) {
  var self = this;

  self._createModal = new Bundle.debug.CreateModal();

  self._createModal.render();

  document.body.appendChild(self._createModal.el);

  function nameSelected(name) {
    self._createModal.destroy();
    self._createModal = null;

    return cb(null, name);
  }

  function modalCanceled() {
    self._createModal.destroy();
    self._createModal = null;

    return cb(true);
  }

  self._createModal.on('name', nameSelected);
  self._createModal.on('cancel', modalCanceled);
};

Bundle.prototype._requestJoinName = function(cb) {
  var self = this;

  self._joinModal = new Bundle.debug.JoinModal();

  self._joinModal.render();

  document.body.appendChild(self._joinModal.el);

  function nameSelected(name) {
    self._joinModal.destroy();
    self._joinModal = null;

    return cb(null, name);
  }

  function modalCanceled() {
    self._joinModal.destroy();
    self._joinModal = null;

    return cb(true);
  }

  self._joinModal.on('name', nameSelected);
  self._joinModal.on('cancel', modalCanceled);
};

/**
 * Connects to Platform, joining the room defined by the session id,
 * then initializes the widgets.
 */
Bundle.prototype._initializePlatform = function(sessionId, name, cb) {
  var self = this;

  var opts = {
    room: sessionId
  };

  if (name) {
    opts.user = {
      displayName: name
    };
  }

  window.goinstant.connect(
    self._connectUrl, opts,
    function(err, connection, room) {
      if (err) {
        return cb(err);
      }

      self._connection = connection;
      self._room = room;

      return self._initializeWidgets(cb);
    }
  );
};

Bundle.prototype._destroyWidgets = function(cb) {
  var self = this;

  async.forEach(self._destroyables, function(d, next) {
    return d.destroy(next);

  }, function(err) {
    if (err) {
      return cb(err);
    }

    self._destroyables = [];

    return cb();
  });
};

Bundle.prototype._initializeWidgets = function(cb) {
  var self = this;

  async.series([
    self._initializeNonVisual,
    self._initializeVisual
  ], function(err) {
    if (err) {
      return self._destroyWidgets(function() {
        return cb(err);
      });
    }

    return cb();
  });
};

Bundle.prototype._initializeNonVisual = function(cb) {
  async.parallel([

    // URL follow has no visual component as of right now, so it can initialize
    // before color is ready
    this._initializeUrlFollower,

    // Color should be initialized before any of the visual widgets, so as to
    // ensure that from this user's perspective, they're colored when they join
    // the session.
    this._chooseUserColor

  ], cb);
};

Bundle.prototype._initializeVisual = function(cb) {
  var self = this;

  domready(function() {
    async.parallel([
      self._initializeUserListWrapper,
      self._initializeScrollIndicator,
      self._initializeClickIndicator,
      self._initializeFormManager,
      self._initializeChat

    ], cb);
  });
};

Bundle.prototype._chooseUserColor = function(cb) {
  var userColors = new Bundle.debug.UserColors({
    room: this._room
  });

  userColors.choose(cb);
};

Bundle.prototype._initializeUserListWrapper = function(cb) {
  var self = this;

  self._userListWrapper = new Bundle.debug.UserListWrapper({
    room: self._room
  });

  self._destroyables.push(self._userListWrapper);

  self._userListWrapper.initialize(function(err) {
    if (err) {
      return cb(err);
    }

    self._userListWrapper.once('leave', _.bind(self.destroy, self));

    return cb();
  });
};

Bundle.prototype._initializeUrlFollower = function(cb) {
  var self = this;

  self._urlFollower = new Bundle.debug.UrlFollower(self._room);

  self._destroyables.push(self._urlFollower);

  self._urlFollower.initialize(cb);
};

Bundle.prototype._initializeScrollIndicator = function(cb) {
  var self = this;

  var version;
  try {
    version = self._urlFollower.getRoomVersion();
  } catch (versionErr) {
    return cb(versionErr);
  }

  self._scrollIndicator = new Bundle.debug.ScrollIndicator({
    room: self._room,
    namespace: 'collaboration-bundle-' + version
  });

  self._destroyables.push(self._scrollIndicator);

  self._scrollIndicator.initialize(cb);
};

Bundle.prototype._initializeClickIndicator = function(cb) {
  var self = this;

  var version;
  try {
    version = self._urlFollower.getRoomVersion();
  } catch (versionErr) {
    return cb(versionErr);
  }

  self._clickIndicator = new Bundle.debug.ClickIndicator({
    room: self._room,
    namespace: 'collaboration-bundle-' + version
  });

  self._destroyables.push(self._clickIndicator);

  self._clickIndicator.initialize(cb);
};

Bundle.prototype._initializeFormManager = function(cb) {
  var self = this;

  var version;
  try {
    version = self._urlFollower.getRoomVersion();

  } catch(err) {
    return cb(err);
  }

  self._formManager = new Bundle.debug.FormManager(self._room, version);

  self._destroyables.push(self._formManager);

  self._formManager.initialize(cb);
};

Bundle.prototype._initializeChat = function(cb) {
  var self = this;

  self._chat = new Bundle.debug.Chat({
    room: self._room,
    position: 'left'
  });

  self._destroyables.push(self._chat);

  self._chat.initialize(cb);
};
