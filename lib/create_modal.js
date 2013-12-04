/*jshint browser:true*/
/*global module, require*/
'use strict';

var emitter = require('emitter');
var classes = require('classes');
var trim = require('trim');
var prevent = require('prevent');
var events = require('events');
var _ = require('lodash');

var OVERLAY_CLASS = 'gi-modal-overlay';
var CONTAINER_CLASS = 'gi-modal-container';
var ENTER_CODE = 13;
var ESC_CODE = 27;

var CREATE_TEMPLATE = _.template(require('../templates/create.ejs.html'));

// Export the constructor
module.exports = CreateModal;

function CreateModal() {
  this.el = document.createElement('div');
  this.events = CreateModal._createEvents(this.el, this);

  this.events.bind('click .' + OVERLAY_CLASS, '_canceled');
  this.events.bind('click .close-modal', '_canceled');
  this.events.bind('click button', '_submitted');
  this.events.bind('keypress button', '_submitted');
  this.events.bind('keypress input', '_submitted');

  this.docEvents = CreateModal._createEvents(document.documentElement, this);

  this.docEvents.bind('keyup', '_docKeypress');
}

CreateModal._createEvents = events;

emitter(CreateModal.prototype);

CreateModal.prototype.render = function() {
  classes(this.el).add(CONTAINER_CLASS);
  this.el.innerHTML = CREATE_TEMPLATE();
};

CreateModal.prototype.destroy = function() {
  if (this.el.parentNode) {
    this.el.parentNode.removeChild(this.el);
  }

  this.removeAllListeners();
  this.events.unbind();
  this.docEvents.unbind('keyup', '_docKeypress');

  this.el = null;
  this.events = null;
  this.docEvents = null;
};

CreateModal.prototype._canceled = function(evt) {
  prevent(evt);

  this.emit('cancel');
};

CreateModal.prototype._getName = function() {
  var nameInput = this.el.querySelector('input');

  var name = nameInput.value;
  name = trim(name);
  name = _.escape(name);

  return name;
};

CreateModal.prototype._submitted = function(evt) {
  if (evt.type == 'keypress' && evt.keyCode != ENTER_CODE) {
    return;
  }

  prevent(evt);

  this.emit('name', this._getName());
};

CreateModal.prototype._docKeypress = function(evt) {
  if (evt.keyCode != ESC_CODE) {
    return;
  }

  prevent(evt);

  this.emit('cancel');
};
