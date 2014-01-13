/*jshint browser:true*/
/*global require*/
describe('Bundle Index', function() {
  'use strict';

  var sinon = window.sinon;
  var assert = window.assert;

  window.goinstant = {};

  var connection;
  var room;
  var VERSION = 0;

  var CONTAINER_CLASS = 'gi-modal-container';

  function MockConnection() {
  }

  function MockRoom() {
  }

  function MockUrlFollower() {
    this.initialize = sinon.stub().yields();
    this.destroy = sinon.stub().yields();
    this.getRoomVersion = sinon.stub().returns(VERSION);
  }

  function MockWidget() {
    this.initialize = sinon.stub().yields();
    this.destroy = sinon.stub().yields();
    this.once = sinon.stub();
  }

  function MockUserColors() {
    this.choose = sinon.stub().yields();
  }

  var sandbox;
  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  beforeEach(function() {
    connection = new MockConnection();
    room = new MockRoom();

    window.goinstant.connect = sandbox.stub().yields(null, connection, room);
  });

  var Bundle = require('collaboration-bundle');

  var defaultOpts = {
    connectUrl: 'TEST_URL'
  };

  it('can be instantiated', function() {
    var bundle;
    assert.noException(function() {
      bundle = new Bundle({
        connectUrl: 'https://goinstant.net/notreal/name'
      });
    });
  });

  describe('constructor', function() {
    describe('without goinstant on the window', function() {
      var goinstant;
      beforeEach(function() {
        goinstant = window.goinstant;
        window.goinstant = null;
      });
      afterEach(function() {
        window.goinstant = goinstant;
      });

      it('errors', function() {
        var c;
        assert.exception(function() {
          c = new Bundle({connectUrl: "thing"});
        }, /Platform code could not be found/);
      });
    });

    it('throws if no connectUrl passed', function() {
      var c;
      assert.exception(function() {
        c = new Bundle({});
      }, /must include connectUrl/);
    });

    it('throws if no options passed', function() {
      var c;
      assert.exception(function() {
        c = new Bundle(null);
      }, /must be passed an options/);
    });
  });

  describe('#initialize & #_requestJoinName', function() {

    var bundle;
    beforeEach(function() {
      bundle = new Bundle(defaultOpts);
    });

    it('initializes with URL session ID', function(done) {
      var TEST_ID = 'TEST ID';
      sandbox.stub(Bundle.debug.inviteUrl, 'retrieve').returns(TEST_ID);
      sandbox.stub(bundle._sessionCookie, 'get').returns();
      sandbox.stub(bundle._sessionCookie, 'set');
      sandbox.stub(bundle, '_requestJoinName').yields(null, 'TEST');
      sandbox.stub(bundle, '_initializePlatform').yields();
      bundle.initialize(function(err) {
        assert.ifError(err);
        sinon.assert.calledWith(bundle._sessionCookie.set, TEST_ID);
        sinon.assert.calledOnce(bundle._initializePlatform);
        done();
      });
    });

    // Tests that the join modal is displayed properly if there's a URL ID
    it('displays the join modal', function() {
      var TEST_ID = 'TEST ID';
      sandbox.stub(Bundle.debug.inviteUrl, 'retrieve').returns(TEST_ID);
      sandbox.stub(bundle._sessionCookie, 'get').returns();
      sandbox.stub(bundle._sessionCookie, 'set');
      sandbox.spy(bundle, '_requestJoinName');
      assert.notOk(document.body.querySelector('.' + CONTAINER_CLASS));
      bundle.initialize();
      sinon.assert.calledWith(bundle._sessionCookie.set, TEST_ID);
      sinon.assert.calledOnce(bundle._requestJoinName);
      assert.ok(document.body.querySelector('.' + CONTAINER_CLASS));
      bundle._joinModal.destroy();
    });

    it('initializes with cookie session ID', function(done) {
      var TEST_ID = 'TEST ID';
      sandbox.stub(Bundle.debug.inviteUrl, 'retrieve').returns();
      sandbox.stub(bundle._sessionCookie, 'get').returns(TEST_ID);
      sandbox.stub(bundle, '_initializePlatform').yields();
      bundle.initialize(function(err) {
        assert.ifError(err);
        sinon.assert.calledOnce(bundle._initializePlatform);
        done();
      });
    });

    it('initializes with no session ID', function(done) {
      sandbox.stub(Bundle.debug.inviteUrl, 'retrieve').returns();
      sandbox.stub(bundle._sessionCookie, 'get').returns();
      sandbox.stub(bundle, '_displayButton');
      bundle.initialize(function(err) {
        assert.ifError(err);
        sinon.assert.calledOnce(bundle._displayButton);
        done();
      });
    });
  });

  describe('#_displayButton & #_removeButton', function() {
    it('renders the button onto the page', function() {
      var bundle = new Bundle(defaultOpts);
      var mockEvents = {
        bind: sandbox.stub(),
        unbind: sandbox.stub()
      };
      var BUTTON_CONTAINER_CLASS = 'gi-start-collaboration-bundle-container';
      sandbox.stub(Bundle.debug, 'events').returns(mockEvents);

      // Adds button to DOM and binds click event
      bundle._displayButton();
      sinon.assert.calledWith(mockEvents.bind, 'click', '_startClick');
      assert.ok(document.body.querySelector('.'+BUTTON_CONTAINER_CLASS));

      // Removes button from DOM
      bundle._removeButton();
      assert.notOk(document.body.querySelector('.'+BUTTON_CONTAINER_CLASS));
    });
  });

  describe('#_startClick & #_requestCreateName', function() {

    var bundle;
    beforeEach(function() {
      bundle = new Bundle(defaultOpts);
    });

    // Tests that the create modal is displayed properly on button click
    it('displays the create modal', function() {
      sandbox.spy(bundle, '_requestCreateName');
      assert.notOk(document.body.querySelector('.' + CONTAINER_CLASS));
      bundle._startClick({});
      sinon.assert.calledOnce(bundle._requestCreateName);
      assert.ok(document.body.querySelector('.' + CONTAINER_CLASS));
      bundle._createModal.destroy();
    });

    it('initializes platform if user submits name', function() {
      sandbox.stub(bundle, '_requestCreateName').yields(null, 'TEST NAME');
      sandbox.stub(bundle._sessionCookie, 'create').returns();
      sandbox.stub(bundle, '_removeButton');
      sandbox.stub(bundle, '_initializePlatform').yields();
      bundle._startClick({});
      sinon.assert.calledOnce(bundle._initializePlatform);
    });

    it('cancels if the user cancels via the modal', function() {
      sandbox.stub(bundle, '_requestCreateName').yields(true);
      sandbox.stub(bundle, '_initializePlatform').yields();
      bundle._startClick({});
      sinon.assert.callCount(bundle._initializePlatform, 0);
    });

    describe('errors', function() {
      it('redisplays button if platform init fails', function() {
        sandbox.stub(bundle, '_requestCreateName').yields(null, 'TEST NAME');
        sandbox.stub(bundle._sessionCookie, 'create').returns();
        sandbox.stub(bundle, '_removeButton');
        sandbox.stub(bundle, '_initializePlatform').yields('ERR');
        sandbox.stub(bundle, '_displayButton');
        bundle._startClick({});
        sinon.assert.calledOnce(bundle._initializePlatform);
        sinon.assert.calledOnce(bundle._displayButton);
      });
    });
  });

  describe('#_initializePlatform', function() {
    var bundle;
    var connectUrl;
    var sessionId;

    var mockSessionCookie;
    var mockUrlFollower;
    var mockWrapper;
    var mockUserColors;
    var mockScrollIndicator;
    var mockClickIndicator;
    var mockFormManager;
    var mockChat;

    beforeEach(function() {
      mockWrapper = new MockWidget();
      sandbox.stub(Bundle.debug, 'UserListWrapper').returns(mockWrapper);

      mockUserColors = new MockUserColors();
      sandbox.stub(Bundle.debug, 'UserColors').returns(mockUserColors);

      mockUrlFollower = new MockUrlFollower();
      sandbox.stub(Bundle.debug, 'UrlFollower').returns(mockUrlFollower);

      mockFormManager = new MockWidget();
      sandbox.stub(Bundle.debug, 'FormManager').returns(mockFormManager);

      mockChat = new MockWidget();
      sandbox.stub(Bundle.debug, 'Chat').returns(mockChat);

      sessionId = "woo";

      mockSessionCookie = {
        isSet: sinon.stub().returns(true),
        get: sinon.stub().returns(sessionId),
        destroy: sinon.stub()
      };
      sandbox.stub(Bundle.debug, 'SessionCookie').returns(mockSessionCookie);

      mockScrollIndicator = new MockWidget();
      sandbox.stub(
        Bundle.debug,
        'ScrollIndicator'
      ).returns(mockScrollIndicator);

      mockClickIndicator = new MockWidget();
      sandbox.stub(Bundle.debug,'ClickIndicator').returns(mockClickIndicator);

      connectUrl = "a connect url";

      bundle = new Bundle({
        connectUrl: connectUrl
      });
    });

    it('connects to goinstant', function(done) {
      bundle.initialize(function(err) {
        assert.ifError(err);
        sinon.assert.calledWith(
          window.goinstant.connect,
          connectUrl,
          {
            room: sessionId
          }
        );

        done();
      });
    });

    it('initializes the user list', function(done) {
      bundle.initialize(function(err) {
        assert.ifError(err);

        sinon.assert.calledWith(
          Bundle.debug.UserListWrapper,
          { room: room }
        );

        sinon.assert.calledOnce(mockWrapper.initialize);

        done();
      });
    });

    it('initializes url following', function(done) {
      bundle.initialize(function(err) {
        assert.ifError(err);

        sinon.assert.calledWith(Bundle.debug.UrlFollower, room);

        sinon.assert.calledOnce(mockUrlFollower.initialize);

        done();
      });
    });

    it('initializes the user colors', function(done) {
      bundle.initialize(function(err) {
        assert.ifError(err);

        sinon.assert.calledWith(
          Bundle.debug.UserColors,
          { room: room }
        );

        sinon.assert.calledOnce(mockUserColors.choose);

        done();
      });
    });

    it('initializes the scroll indicators', function(done) {
      bundle.initialize(function(err) {
        assert.ifError(err);

        sinon.assert.calledWith(
          Bundle.debug.ScrollIndicator,
          {
            room: room,
            namespace: 'collaboration-bundle-' + VERSION
          }
        );

        sinon.assert.calledOnce(mockScrollIndicator.initialize);

        done();
      });
    });

    it('initializes the click indicators', function(done) {
      bundle.initialize(function(err) {
        assert.ifError(err);

        sinon.assert.calledWith(
          Bundle.debug.ClickIndicator,
          {
            room: room,
            namespace: 'collaboration-bundle-' + VERSION
          }
        );

        sinon.assert.calledOnce(mockClickIndicator.initialize);

        done();
      });
    });

    it('initializes the form manager', function(done) {
      bundle.initialize(function(err) {
        assert.ifError(err);

        sinon.assert.calledWith(Bundle.debug.FormManager, room, VERSION);
        sinon.assert.calledOnce(mockFormManager.initialize);

        done();
      });
    });

    it('initializes the chat widget', function(done) {
      bundle.initialize(function(err) {
        assert.ifError(err);

        sinon.assert.calledWith(Bundle.debug.Chat,
          {
            position: 'left',
            room: room
          }
        );
        sinon.assert.calledOnce(mockChat.initialize);

        done();
      });
    });

    describe('errors', function() {
      it('calls back with an error if connect fails', function(done) {
        var fakeErr = new Error('err');
        window.goinstant.connect = sandbox.stub().yields(fakeErr);

        var cb = sinon.spy(function(err) {
          assert.equal(err, fakeErr);
          sinon.assert.calledOnce(cb);

          done();
        });

        bundle.initialize(cb);
      });

      describe('user list setup', function() {
        var fakeErr;
        beforeEach(function() {
          fakeErr = new Error('err');
          mockWrapper.initialize = sinon.stub().yields(fakeErr);
        });

        it('calls back with an error', function(done) {
          var cb = sinon.spy(function(err) {
            assert.equal(err, fakeErr);
            sinon.assert.calledOnce(cb);

            done();
          });

          bundle.initialize(cb);
        });

        it('deactivates widgets', function(done) {
          bundle.initialize(function() {
            sinon.assert.calledOnce(mockUrlFollower.destroy);
            done();
          });
        });
      });


      it('calls back with an error if url following fails', function(done) {

        var fakeErr = new Error('err');
        mockUrlFollower.initialize = sinon.stub().yields(fakeErr);

        var cb = sinon.spy(function(err) {
          assert.equal(err, fakeErr);
          sinon.assert.calledOnce(cb);

          done();
        });

        bundle.initialize(cb);
      });

      describe('user color selection', function() {
        var fakeErr;
        beforeEach(function() {
          fakeErr = new Error('err');
          mockUserColors.choose = sinon.stub().yields(fakeErr);
        });

        it('calls back with an error', function(done) {
          var cb = sinon.spy(function(err) {
            assert.equal(err, fakeErr);
            sinon.assert.calledOnce(cb);

            done();
          });

          bundle.initialize(cb);
        });

        it('deactivates widgets', function(done) {
          bundle.initialize(function() {
            sinon.assert.calledOnce(mockUrlFollower.destroy);
            done();
          });
        });

      });
    });
  });
});
