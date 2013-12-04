/*jshint browser:true*/
/*global require*/
describe('Create Modal', function() {
  'use strict';

  var sinon = window.sinon;
  var assert = window.assert;

  var CreateModal = require('collaboration-bundle/lib/create_modal');

  var KEYPRESS_ENTER = { type: 'keypress', keyCode: 13 };
  var KEYPRESS_NON_ENTER = {type: 'keypress', keyCode: 97 };

  var KEYUP_ESC = { type: 'keyup', keyCode: 27 };
  var KEYUP_NON_ESC = { type: 'keyup', keyCode: 97 };

  var CLICK = { type: 'click' };

  var TEST_NAME = 'Test Name';

  var sandbox;
  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('constructor', function() {

    it('constructs the modal', function() {
      var fakeBind = sandbox.stub().returns({});
      sandbox.stub(CreateModal, '_createEvents').returns({ bind: fakeBind });
      var createModal = new CreateModal();
      assert.ok(createModal);
      sinon.assert.calledWith(fakeBind, 'keypress button', '_submitted');
      sinon.assert.calledWith(fakeBind, 'keypress input', '_submitted');
      sinon.assert.calledWith(fakeBind, 'click button', '_submitted');
      sinon.assert.calledWith(fakeBind, 'click .close-modal', '_canceled');
      sinon.assert.calledWith(fakeBind, 'click .gi-modal-overlay', '_canceled');
      sinon.assert.calledWith(fakeBind, 'keyup', '_docKeypress');
    });
  });

  describe('methods', function() {

    var createModal;

    beforeEach(function() {
      createModal = new CreateModal();
    });

    describe('#render', function() {
      it('renders the create modal', function() {
        assert.notOk(createModal.el.innerHTML);
        createModal.render();
        assert.ok(createModal.el.innerHTML);
      });
    });

    describe('#destroy', function() {
      it('destroys the modal when appending', function() {
        createModal.render();

        var eventsUnbind = sandbox.spy(createModal.events, 'unbind');
        var docEventsUnbind = sandbox.spy(createModal.docEvents, 'unbind');

        document.body.appendChild(createModal.el);
        assert.ok(createModal.el);
        assert.ok(document.querySelector('.gi-modal-container'));

        createModal.destroy();
        assert.notOk(createModal.el);
        assert.notOk(document.querySelector('.gi-modal-container'));

        sinon.assert.called(eventsUnbind);
        sinon.assert.calledWith(docEventsUnbind, 'keyup', '_docKeypress');
      });

      it('destroys the modal without appending', function() {
        createModal.render();

        var eventsUnbind = sandbox.spy(createModal.events, 'unbind');
        var docEventsUnbind = sandbox.spy(createModal.docEvents, 'unbind');

        assert.ok(createModal.el);

        createModal.destroy();
        assert.notOk(createModal.el);

        sinon.assert.called(eventsUnbind);
        sinon.assert.calledWith(docEventsUnbind, 'keyup', '_docKeypress');
      });
    });

    describe('#_canceled', function() {
      it('emits "cancel" when called', function() {
        createModal.render();

        sandbox.spy(createModal, 'emit');

        createModal._canceled(KEYPRESS_NON_ENTER);

        sinon.assert.callCount(createModal.emit, 1);
        sinon.assert.calledWith(createModal.emit, 'cancel');
      });
    });

    describe('#_submitted', function() {

      it('does not emit "name" on non-enter keypress evt', function() {
        createModal.render();

        createModal.el.querySelector('input').value = TEST_NAME;
        sandbox.spy(createModal, 'emit');

        createModal._submitted(KEYPRESS_NON_ENTER);

        sinon.assert.callCount(createModal.emit, 0);
      });
      it('emits "name" on enter keypress evt', function() {
        createModal.render();

        createModal.el.querySelector('input').value = TEST_NAME;
        sandbox.spy(createModal, 'emit');

        createModal._submitted(KEYPRESS_ENTER);

        sinon.assert.callCount(createModal.emit, 1);
        sinon.assert.calledWith(createModal.emit, 'name', TEST_NAME);
      });

      it('emits "name" on click evt', function() {
        createModal.render();

        createModal.el.querySelector('input').value = TEST_NAME;
        sandbox.spy(createModal, 'emit');

        createModal._submitted(CLICK);

        sinon.assert.callCount(createModal.emit, 1);
        sinon.assert.calledWith(createModal.emit, 'name', TEST_NAME);
      });
    });

    describe('#_docKeypress', function() {
      it('does not emit "cancel" on non-esc keyup evt', function() {
        createModal.render();

        sandbox.spy(createModal, 'emit');

        createModal._docKeypress(KEYUP_NON_ESC);

        sinon.assert.callCount(createModal.emit, 0);
      });

      it('emits "cancel" on esc keyup evt', function() {
        createModal.render();

        sandbox.spy(createModal, 'emit');

        createModal._docKeypress(KEYUP_ESC);

        sinon.assert.callCount(createModal.emit, 1);
        sinon.assert.calledWith(createModal.emit, 'cancel');
      });
    });

  });
});
