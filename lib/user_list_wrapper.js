/*jshint browser:true*/
/*global module, require*/
'use strict';

var classes = require('classes');
var _ = require('lodash');
var UserList = require('user-list');
var emitter = require('emitter');
var events = require('events');
var prevent = require('prevent');
var SessionCookie =  require('./session_cookie');
var CollapseCookie = require('./collapse_cookie');
var inviteUrl = require('./invite_url');

var TEMPLATE = _.template(require('../templates/user_list_wrapper.ejs.html'));

// Used for the wrapper that contains all of the extra userlist controls.
var WRAPPER_CLASS = 'gi-userlist-wrapper';

// Identifies element that UserList will be passed as 'container' option.
var CONTAINER_CLASS = 'gi-userlist-container';

var COLLAPSE_BUTTON_CLASS = 'gi-collapse';
var INVITE_BUTTON_CLASS = 'gi-invite';
var LEAVE_BUTTON_CLASS = 'gi-leave';

var COLLAPSED_CLASS = 'gi-collapsed';
var INVITING_CLASS = 'gi-inviting';

module.exports = UserListWrapper;

function UserListWrapper(opts) {
  this._opts = opts;

  this.el = document.createElement('div');

  this.events = UserListWrapper._createEvents(this.el, this);

  // Listen to clicks on the collapse button and anything inside it
  this.events.bind('click .' + COLLAPSE_BUTTON_CLASS, '_collapseClick');

  // Listen to clicks on the invite button and anything inside it
  this.events.bind('click .' + INVITE_BUTTON_CLASS, '_inviteClick');

  // Listen to clicks on the leave button and anything inside it
  this.events.bind('click .' + LEAVE_BUTTON_CLASS, '_leaveClick');

  this.sessionCookie = new SessionCookie();
  this.collapseCookie = new UserListWrapper._CollapseCookie();

  this._render();

  var container = this.el.querySelector('.' + CONTAINER_CLASS);

  var userListOpts = {
    room: this._opts.room,
    container: container
  };

  this._userList = new UserListWrapper._UserList(userListOpts);
}

UserListWrapper._createEvents = events;
UserListWrapper._classes = classes;
UserListWrapper._UserList = UserList;
UserListWrapper._CollapseCookie = CollapseCookie;

emitter(UserListWrapper.prototype);

UserListWrapper.prototype.initialize = function(cb) {
  var self = this;

  self._userList.initialize(function(err) {
    if (err) {
      return cb(err);
    }

    document.body.appendChild(self.el);

    return cb();
  });
};

UserListWrapper.prototype.destroy = function(cb) {
  if (!this.el.parentNode) {
    return cb(new Error('Widget has not yet been initialized'));
  }

  this.el.parentNode.removeChild(this.el);

  this.collapseCookie.destroy();

  this._userList.destroy(cb);
};

UserListWrapper.prototype._render = function() {
  var classList = UserListWrapper._classes(this.el);

  classList.add(WRAPPER_CLASS);

  var collapseStatus = this.collapseCookie.get();

  // We store collapsed status of user list to sync during url follow
  if (!collapseStatus) {
    collapseStatus = this.collapseCookie.create();
    classList.add(INVITING_CLASS);
  }

  if (collapseStatus == 'open') {
    classList.remove(COLLAPSED_CLASS);
  } else if (collapseStatus == 'closed') {
    classList.add(COLLAPSED_CLASS);
    classList.remove(INVITING_CLASS);
  }

  this.el.innerHTML = TEMPLATE({
    inviteUrl: inviteUrl.generate(this.sessionCookie.get())
  });
};

UserListWrapper.prototype._collapseClick = function(evt) {
  prevent(evt);


  var classList = UserListWrapper._classes(this.el);

  if (classList.has(COLLAPSED_CLASS)) {
    classList.remove(COLLAPSED_CLASS);
    this.collapseCookie.set('open');

  } else {
    classList.add(COLLAPSED_CLASS);
    this.collapseCookie.set('closed');
    classList.remove(INVITING_CLASS);
  }
};

UserListWrapper.prototype._inviteClick = function(evt) {
  prevent(evt);

  UserListWrapper._classes(this.el).toggle(INVITING_CLASS);
};

UserListWrapper.prototype._leaveClick = function(evt) {
  prevent(evt);

  this.emit('leave');
};
