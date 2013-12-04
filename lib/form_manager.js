/*jshint browser:true*/
/*global module, require*/
'use strict';

module.exports = FormManager;

var _ = require('lodash');
var async = require('async');
var console = window.console;

FormManager.debug = {
  Form: require('form')
};

/**
 * @fileOverview
 * The FormManager manages instances of the Form widget on the page.
 *
 * On instantiation, it goes over all of the forms on the page and creates an
 * instance of a Form widget for that Form.
 *
 * On initialization, it initializes all of the widgets.
 */
function FormManager(room, locationVersion) {
  var self = this;

  self._room = room;
  self._locationVersion = locationVersion;

  self.widgets = [];

  _.each(document.forms, function(form) {
    // Ignores engine.io IE compatibility mode
    if (form.target.match('eio_iframe')) {
      return;
    }

    try {
      self.add(form);

    } catch (err) {
      if (!console) {
        return;
      }

      // If a form could not be added, we want to continue to initialize the
      // rest of the form and initialize the rest of the page. This is so that
      // the developer doesn't fail to setup the entire bundle widget because
      // one form on their page isn't set up properly.
      console.log(err.message);
      console.log(form);
    }
  });
}

var GOINSTANT_ID = 'data-goinstant-id';
FormManager.buildKeyName = function(form, version) {
  var identifier = form.getAttribute(GOINSTANT_ID) ||
                   form.getAttribute('id');

  if (!identifier) {
    var err = new Error('Form found that could not be identified.');
    err.form = form;
    throw err;
  }

  return [
    'goinstant-collaboration-bundle',
    'forms',
    version,
    identifier
  ].join('/');
};

FormManager.prototype._buildKey = function(form) {
  var keyName = FormManager.buildKeyName(form, this._locationVersion);
  return this._room.key(keyName);
};

FormManager.prototype.add = function(form) {
  var key = this._buildKey(form);

  var widget = new FormManager.debug.Form({
    el: form,
    room: this._room,
    key: key
  });

  this.widgets.push(widget);
};

FormManager.prototype.initialize = function(cb) {
  var self = this;

  async.forEach(
    self.widgets,
    function(w, next) {
      w.initialize(next);
    },
    function(err) {
      if (err) {
        return self.destroy(function() {
          // Pass the original error that caused the failure, and ignore any
          // other errors that may occur during the destroy.
          return cb(err);
        });
      }

      return cb();
    }
  );
};

FormManager.prototype.destroy = function(cb) {
  var self = this;

  async.forEach(
    self.widgets,
    function(w, next) {
      w.destroy(next);
    },
    function(err) {
      if (err) {
        return cb(err);
      }

      return cb();
    }
  );
};
