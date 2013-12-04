/*jshint browser:true*/
/*global require*/
describe('FormManager', function() {
  'use strict';

  var sinon = window.sinon;
  var assert = window.assert;
  var _ = require('lodash');

  var FormManager = require('collaboration-bundle/lib/form_manager');

  describe('constructing', function() {
    var version;
    var firstForm;
    var firstFormKeyName;

    var secondForm;
    var secondFormKeyName;

    var sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    function MockWidget() {
      this.initialize = sinon.stub().yields();
      this.destroy = sinon.stub().yields();
    }

    // Used to ensure identity, since sinon will do deep object comparison.
    var keyId = 0;
    function MockKey() {
      this.id = keyId++;
    }

    beforeEach(function() {
      version = 1;

      firstForm = document.createElement('form');
      firstForm.id = "firstId";
      firstFormKeyName = FormManager.buildKeyName(firstForm, version);

      secondForm = document.createElement('form');
      secondForm.id = "secondId";
      secondFormKeyName = FormManager.buildKeyName(secondForm, version);

      document.body.appendChild(firstForm);
      document.body.appendChild(secondForm);

      sandbox.stub(FormManager.debug, 'Form');
    });

    afterEach(function() {
      document.body.removeChild(firstForm);
      document.body.removeChild(secondForm);
    });

    var formManager;

    it('makes a form widget for every form on the page', function() {
      var firstWidget = new MockWidget();
      var secondWidget = new MockWidget();

      var mockRoom = {
        key: sinon.stub()
      };

      // We want to know that the right keys are being passed to the right
      // widgets.
      // Use object identity to ensure this.
      var mockFirstKey = new MockKey();
      mockRoom.key.withArgs(firstFormKeyName).returns(mockFirstKey);

      var mockSecondKey = new MockKey();
      mockRoom.key.withArgs(secondFormKeyName).returns(mockSecondKey);

      var firstWidgetArgs = {
        el: firstForm,
        room: mockRoom,
        key: mockFirstKey
      };

      FormManager.debug.Form.withArgs(firstWidgetArgs).returns(firstWidget);

      var secondWidgetArgs = {
        el: secondForm,
        room: mockRoom,
        key: mockSecondKey
      };

      FormManager.debug.Form.withArgs(secondWidgetArgs).returns(secondWidget);

      formManager = new FormManager(mockRoom, version);

      sinon.assert.callCount(FormManager.debug.Form, 2);

      sinon.assert.calledWith(
        FormManager.debug.Form,
        firstWidgetArgs
      );

      sinon.assert.calledWith(
        FormManager.debug.Form,
        secondWidgetArgs
      );

      assert.include(formManager.widgets, firstWidget);
      assert.include(formManager.widgets, secondWidget);
    });

    it('ignores engine.io forms', function() {
      var engineForm = document.createElement('form');
      engineForm.target = 'eio_iframe_0';
      document.body.appendChild(engineForm);

      // Created by the beforeEach, removed for this tests purpose
      document.body.removeChild(firstForm);
      document.body.removeChild(secondForm);

      var mockRoom = {
        key: sinon.stub()
      };

      var thisFormManager = new FormManager(mockRoom, version);

      // Called to please jshint
      assert.ok(thisFormManager);

      sinon.assert.callCount(FormManager.debug.Form, 0);
      document.body.removeChild(engineForm);

      // Re-added as to not break the afterEach
      document.body.appendChild(firstForm);
      document.body.appendChild(secondForm);
    });

    describe('then initializing', function() {
      it('when successful, initializes every widget', function(done) {
        formManager.initialize(function(err) {
          assert.ifError(err);

          _.each(formManager.widgets, function(w) {
            sinon.assert.calledOnce(w.initialize);
            sinon.assert.calledOnce(w.initialize);
          });

          done();
        });
      });

      it('when it fails, destroys every widget', function(done) {
        var mockErr = {an: 'error'};
        formManager.widgets[0].initialize.yields(mockErr);

        formManager.initialize(function(err) {
          assert.equal(err, mockErr);

          _.each(formManager.widgets, function(w) {
            sinon.assert.calledOnce(w.destroy);
            sinon.assert.calledOnce(w.destroy);
          });

          done();
        });
      });
    });
  });

  describe('building a key name', function() {
    it('creates a nested key for the version and the form id', function() {
      var keyName = 'goinstant-collaboration-bundle/forms/0/my-id';
      var form = document.createElement('form');
      form.id = 'my-id';

      assert.equal(FormManager.buildKeyName(form, 0), keyName);
    });

    it('creates a key for version and form data-goinstant-id', function() {
      var keyName = 'goinstant-collaboration-bundle/forms/0/my-id';
      var form = document.createElement('form');
      form.setAttribute('data-goinstant-id', 'my-id');

      assert.equal(FormManager.buildKeyName(form, 0), keyName);
    });

    it('data-goinstant-id supercedes id', function() {
      var keyName = 'goinstant-collaboration-bundle/forms/0/my-id';
      var form = document.createElement('form');
      form.setAttribute('data-goinstant-id', 'my-id');
      form.setAttribute('id', 'something-else');

      assert.equal(FormManager.buildKeyName(form, 0), keyName);
    });
  });
});
