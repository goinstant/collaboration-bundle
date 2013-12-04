/*jshint browser:true*/
/*global require*/
describe('Join Modal', function() {
  'use strict';

  var sinon = window.sinon;
  var assert = window.assert;

  var JoinModal = require('collaboration-bundle/lib/join_modal');

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
      sandbox.stub(JoinModal, '_createEvents').returns({ bind: fakeBind });
      var joinModal = new JoinModal();
      assert.ok(joinModal);
      sinon.assert.calledWith(fakeBind, 'keypress button', '_submitted');
      sinon.assert.calledWith(fakeBind, 'keypress input', '_submitted');
      sinon.assert.calledWith(fakeBind, 'click button', '_submitted');
      sinon.assert.calledWith(
        fakeBind,
        'click .gi-modal-overlay',
        '_submitted'
      );
      sinon.assert.calledWith(fakeBind, 'keyup', '_docKeypress');
    });
  });

  describe('methods', function() {

    var joinModal;

    beforeEach(function() {
      joinModal = new JoinModal();
    });

    describe('#render', function() {
      it('renders the join modal', function() {
        assert.notOk(joinModal.el.innerHTML);
        joinModal.render();
        assert.ok(joinModal.el.innerHTML);
      });
    });

    describe('#destroy', function() {
      it('destroys the modal when appending', function() {
        joinModal.render();

        var eventsUnbind = sandbox.spy(joinModal.events, 'unbind');
        var docEventsUnbind = sandbox.spy(joinModal.docEvents, 'unbind');

        document.body.appendChild(joinModal.el);
        assert.ok(joinModal.el);
        assert.ok(document.querySelector('.gi-modal-container'));

        joinModal.destroy();
        assert.notOk(joinModal.el);
        assert.notOk(document.querySelector('.gi-modal-container'));

        sinon.assert.called(eventsUnbind);
        sinon.assert.calledWith(docEventsUnbind, 'keyup', '_docKeypress');
      });

      it('destroys the modal without appending', function() {
        joinModal.render();

        var eventsUnbind = sandbox.spy(joinModal.events, 'unbind');
        var docEventsUnbind = sandbox.spy(joinModal.docEvents, 'unbind');

        assert.ok(joinModal.el);

        joinModal.destroy();
        assert.notOk(joinModal.el);

        sinon.assert.called(eventsUnbind);
        sinon.assert.calledWith(docEventsUnbind, 'keyup', '_docKeypress');
      });
    });

    describe('#_submitted', function() {

      it('does not emit "name" on non-enter keypress evt', function() {
        joinModal.render();

        joinModal.el.querySelector('input').value = TEST_NAME;
        sandbox.spy(joinModal, 'emit');

        joinModal._submitted(KEYPRESS_NON_ENTER);

        sinon.assert.callCount(joinModal.emit, 0);
      });

      it('emits "name" on enter keypress evt', function() {
        joinModal.render();

        joinModal.el.querySelector('input').value = TEST_NAME;
        sandbox.spy(joinModal, 'emit');

        joinModal._submitted(KEYPRESS_ENTER);

        sinon.assert.callCount(joinModal.emit, 1);
        sinon.assert.calledWith(joinModal.emit, 'name', TEST_NAME);
      });

      it('emits "name" on click evt', function() {
        joinModal.render();

        joinModal.el.querySelector('input').value = TEST_NAME;
        sandbox.spy(joinModal, 'emit');

        joinModal._submitted(CLICK);

        sinon.assert.callCount(joinModal.emit, 1);
        sinon.assert.calledWith(joinModal.emit, 'name', TEST_NAME);
      });
    });

    describe('#_docKeypress', function() {
      it('does not emit "name" on non-esc keyup evt', function() {
        joinModal.render();

        sandbox.spy(joinModal, 'emit');

        joinModal._docKeypress(KEYUP_NON_ESC);

        sinon.assert.callCount(joinModal.emit, 0);
      });

      it('emits blank "name" on esc keyup evt', function() {
        joinModal.render();

        sandbox.spy(joinModal, 'emit');

        joinModal._docKeypress(KEYUP_ESC);

        sinon.assert.callCount(joinModal.emit, 1);
        sinon.assert.calledWith(joinModal.emit, 'name', '');
      });
    });

  });
});
