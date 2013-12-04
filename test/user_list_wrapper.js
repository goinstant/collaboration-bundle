/*jshint browser:true*/
/*global require*/
describe('User List Wrapper', function() {
  'use strict';

  var sinon = window.sinon;
  var assert = window.assert;

  var UserListWrapper = require('collaboration-bundle/lib/user_list_wrapper');

  var mockRoom = {};

  var COLLAPSED_CLASS = 'gi-collapsed';
  var INVITING_CLASS = 'gi-inviting';
  var WRAPPER_CLASS = 'gi-userlist-wrapper';

  var sandbox;
  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  var mockClasses = {
    add: function() {},
    remove: function() {},
    has: function() {},
    toggle: function() {}
  };

  describe('constructor', function() {
    it('constructs the wrapper', function() {
      var mockBind = sandbox.stub().returns({});
      sandbox.stub(UserListWrapper, '_createEvents').returns({bind: mockBind});
      sandbox.stub(UserListWrapper, '_UserList').returns({});
      var userListWrapper = new UserListWrapper({ room: mockRoom });
      assert.ok(userListWrapper);
      sinon.assert.calledWith(mockBind, 'click .gi-collapse', '_collapseClick');
      sinon.assert.calledWith(mockBind, 'click .gi-invite', '_inviteClick');
      sinon.assert.calledWith(mockBind, 'click .gi-leave', '_leaveClick');
      sinon.assert.callCount(mockBind, 3);
      sinon.assert.calledWith(
        UserListWrapper._UserList,
        {
          room: mockRoom,
          container: userListWrapper.el.querySelector('.gi-userlist-container')
        }
      );
    });
  });

  describe('methods', function() {
    var userListWrapper;

    describe('#initialize', function() {
      it('initializes when user list does not error', function(done) {
        userListWrapper = new UserListWrapper({ room: mockRoom });
        sandbox.stub(userListWrapper._userList, 'initialize').yields();
        sandbox.stub(userListWrapper._userList, 'destroy').yields();
        userListWrapper.initialize(function() {
          assert.ok(document.body.querySelector('.' + WRAPPER_CLASS));
          userListWrapper.destroy(done);
        });
      });

      // Also tests the results of #_render
      it('initializes open with no collapse status', function(done) {
        sandbox.stub(UserListWrapper, '_CollapseCookie').returns(
          {
            get: sandbox.stub().returns(),
            create: sandbox.stub().returns('open'),
            destroy: sandbox.stub()
          }
        );
        userListWrapper = new UserListWrapper({ room: mockRoom });
        sandbox.stub(userListWrapper._userList, 'initialize').yields();
        sandbox.stub(userListWrapper._userList, 'destroy').yields();
        userListWrapper.initialize(function() {
          assert.ok(document.body.querySelector('.'+INVITING_CLASS));
          userListWrapper.destroy(done);
        });
      });

      // Also tests the results of #_render
      it('initializes open with open collapse status', function(done) {
        sandbox.stub(UserListWrapper, '_CollapseCookie').returns(
          {
            get: sandbox.stub().returns('open'),
            destroy: sandbox.stub()
          }
        );
        userListWrapper = new UserListWrapper({ room: mockRoom });
        sandbox.stub(userListWrapper._userList, 'initialize').yields();
        sandbox.stub(userListWrapper._userList, 'destroy').yields();
        userListWrapper.initialize(function() {
          assert.notOk(document.body.querySelector('.'+COLLAPSED_CLASS));
          userListWrapper.destroy(done);
        });
      });

      // Also tests the results of #_render
      it('initializes closed with a closed collapse status', function(done) {
        sandbox.stub(UserListWrapper, '_CollapseCookie').returns(
          {
            get: sandbox.stub().returns('closed'),
            destroy: sandbox.stub()
          }
        );
        userListWrapper = new UserListWrapper({ room: mockRoom });
        sandbox.stub(userListWrapper._userList, 'initialize').yields();
        sandbox.stub(userListWrapper._userList, 'destroy').yields();
        userListWrapper.initialize(function(err) {
          assert.ifError(err);
          assert.ok(document.body.querySelector('.'+COLLAPSED_CLASS));
          userListWrapper.destroy(done);
        });
      });

      describe('errors', function() {
        it('returns err in cb when userlist init errors', function(done) {
          userListWrapper = new UserListWrapper({ room: mockRoom });
          var _ERROR = 'TEST ERROR';
          sandbox.stub(userListWrapper._userList, 'initialize').yields(_ERROR);
          userListWrapper.initialize(function(err) {
            assert.equal(err, _ERROR);
            done();
          });
        });
      });
    });

    describe('#destroy', function() {
      it('destroys the wrapper when its been initialized', function(done) {
        sandbox.stub(userListWrapper._userList, 'initialize').yields();
        sandbox.stub(userListWrapper._userList, 'destroy').yields();
        userListWrapper.initialize(function() {
          assert.ok(document.body.querySelector('.' + WRAPPER_CLASS));
          userListWrapper.destroy(function(err) {
            assert.ifError(err);
            assert.notOk(document.body.querySelector('.' + WRAPPER_CLASS));
            done();
          });
        });
      });
    });

    describe('#_collapseClick', function() {

      beforeEach(function() {
        sandbox.stub(UserListWrapper, '_classes').returns(mockClasses);
        sandbox.stub(userListWrapper.collapseCookie, 'set');
        sandbox.stub(mockClasses, 'add');
        sandbox.stub(mockClasses, 'remove');
      });

      it('opens the user list when closes', function() {
        sandbox.stub(mockClasses, 'has').returns(true);
        userListWrapper._collapseClick({});
        sinon.assert.calledWith(mockClasses.remove, COLLAPSED_CLASS);
        sinon.assert.calledWith(userListWrapper.collapseCookie.set, 'open');
      });

      it('closes the user list when open', function() {
        sandbox.stub(mockClasses, 'has').returns(false);
        userListWrapper._collapseClick({});
        sinon.assert.calledWith(mockClasses.remove, INVITING_CLASS);
        sinon.assert.calledWith(mockClasses.add, COLLAPSED_CLASS);
        sinon.assert.calledWith(userListWrapper.collapseCookie.set, 'closed');
      });
    });

    describe('#_inviteClick', function() {

      beforeEach(function() {
        sandbox.stub(UserListWrapper, '_classes').returns(mockClasses);
        sandbox.stub(mockClasses, 'toggle');
      });

      it('toggles the invite class when called', function() {
        userListWrapper._inviteClick({});
        sinon.assert.calledWith(mockClasses.toggle, INVITING_CLASS);
      });
    });

    describe('#_leaveClick', function() {
      it('emits "leave" evt when called', function() {
        sandbox.spy(userListWrapper, 'emit');
        userListWrapper._leaveClick({});
        sinon.assert.calledWith(userListWrapper.emit, 'leave');
      });
    });
  });
});
