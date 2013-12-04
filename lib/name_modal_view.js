/*jshint browser:true*/
/*global module, require*/
'use strict';

var classes = require('classes');
var emitter = require('emitter');
var trim = require('trim');
var prevent = require('prevent');
var events = require('events');
var _ = require('lodash');

var OVERLAY_CLASS = 'gi-modal-overlay';
var ENTER_CODE = 13;

var CREATE_TEMPLATE = _.template(require('../templates/create.ejs.html'));

// Export the constructor
module.exports = NameModalView;

function NameModalView() {
  this.el = document.createElement('div');
  this.events = events(this.el, this);
  this.events.bind('click ' + OVERLAY_CLASS, '_canceled');
  this.events.bind('click .close-modal', '_canceled');
  this.events.bind('click button', '_submitted');
  this.events.bind('keypress button', '_submitted');
  this.events.bind('keypress input', '_submitted');
}

emitter(NameModalView.prototype);

NameModalView.prototype.render = function() {
  classes(this.el).add(OVERLAY_CLASS);

  this.el.innerHTML = CREATE_TEMPLATE();
};

NameModalView.prototype.destroy = function() {
  this.el.parentNode.removeChild(this.el);
  this.removeAllListeners();
  this.events.unbind();
};

NameModalView.prototype._canceled = function(evt) {
  prevent(evt);

  this.emit('cancel');
};

NameModalView.prototype._getName = function() {
  var nameInput = this.el.querySelector('input');

  var name = nameInput.value;
  name = trim(name);
  name = _.escape(name);

  return name;
};

NameModalView.prototype._submitted = function(evt) {
  prevent(evt);

  if (evt.type == 'keypress' && evt.keyCode != ENTER_CODE) {
    return;
  }

  this.emit('name', this._getName());
};
