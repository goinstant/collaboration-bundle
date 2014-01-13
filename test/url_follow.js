/*jshint browser:true, node:false */
/*global require*/

'use strict';

window.goinstant = {
  errors: {
    CollisionError: function(msg){
      this.message = msg;
    }
  }
};

describe('URL Follow Component', function() {
  var UrlFollower = require('collaboration-bundle/lib/url_follow');
  var follower;

  var assert = window.assert;
  var sinon = window.sinon;

  var fakeRoom;
  var fakeUser;
  var fakeUserKey;

  var fakeUsers; // TODO: Not needed
  var fakeUsersKey;
  var fakeUserKeys;

  var fakeLockedKey;
  var lockedMap;
  var sandbox;

  function createFakeKey(name) {
    return {
      name: name,
      get: sandbox.stub().yields(),
      set: sandbox.stub().yields(),
      key: createFakeKey,
      remove: sandbox.stub().yields()
    };
  }

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    fakeRoom = {};
    fakeRoom._platform = {};

    fakeUser = {
      displayName: 'Guest',
      id: '1234',
    };

    fakeUserKey = createFakeKey('guest1');
    fakeRoom.self = sandbox.stub().returns(
      {
        get: sandbox.stub().yields(null, fakeUser, fakeUserKey)
      }
    );
    fakeRoom._platform._user = fakeUser;

    fakeUsers = [
      {
        displayName: 'Guest',
        id: '1234',
        get: function(cb) {
          return cb(null, fakeUsers[0]);
        },
        set: function(value, opts, cb) {
          return cb(null, value);
        },
        key: function() {
          return fakeUsers[0];
        }
      },
      {
        displayName: 'Guest',
        id: '5678',
        get: function(cb) {
          return cb(null, fakeUsers[1]);
        },
        set: function(value, opts, cb) {
          return cb(null, value);
        },
        key: function() {
          return fakeUsers[1];
        }
      }
    ];

    fakeUserKeys = [
      createFakeKey(),
      createFakeKey()
    ];

    fakeUsersKey = createFakeKey('/.users');

    fakeLockedKey = createFakeKey('locked');
    var fakeContext = {};
    lockedMap = {};

    fakeLockedKey.get = sandbox.stub().yields(null, lockedMap, fakeContext);

    fakeRoom.key = sandbox.stub();
    fakeRoom.key.returns(createFakeKey());
    fakeRoom.key.withArgs('/.users/' + fakeUsers[0].id).returns(fakeUsers[0]);

  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('constructor', function() {
    it('returns a new instance of UrlFollower', function() {

      follower = new UrlFollower(fakeRoom);

      assert.isObject(follower);
    });

    describe('errors', function() {

      it('throws if no passed room', function() {
        assert.exception(function() {
          follower = new UrlFollower();
        }, 'URLFollow: Room object not found or invalid');
      });

      it('throws if room passed is not an object', function() {
        assert.exception(function() {
          var room = 'room';

          follower = new UrlFollower(room);
        }, 'URLFollow: Room object not found or invalid');
      });
    });
  });

  describe('#initialize', function() {
    beforeEach(function() {
      follower = new UrlFollower(fakeRoom);
    });

    it('calls #_lead when user is leading', function(done) {
      var namespaceData = {version: 0};
      namespaceData[fakeUser.id] = {version: 0};
      follower._lead = sandbox.stub().yields();
      follower._namespace.get = sandbox.stub().yields(null, namespaceData, {});
      follower._room.self().get = sandbox.stub().yields(null, fakeUser, {});

      follower.initialize(function(err) {
        assert.ifError(err);
        sinon.assert.calledOnce(follower._lead);
        done();
      });
    });

    it('calls #_follow when user is following', function(done) {
      var testUrl = 'http://goinstant.com/path';
      var namespaceData = {version: 1, url: { 1: 'http://goinstant.com' }};
      namespaceData[fakeUser.id] = {version: 0};
      follower._follow = sandbox.stub().yields();
      follower._getDocumentLocation = sandbox.stub().returns(testUrl);

      follower._namespace.get = sandbox.stub().yields(null, namespaceData, {});
      follower._room.self().get = sandbox.stub().yields(null, fakeUser, {});

      follower.initialize(function(err) {
        assert.ifError(err);
        sinon.assert.calledOnce(follower._follow);
        done();
      });
    });

    describe('errors', function() {

      it('sends room.user error to callback', function(done) {
        var TEST_ERROR = 'TEST_ERROR';
        follower._room.self().get = sandbox.stub().yields(TEST_ERROR);
        follower.initialize(function(err) {
          assert.ok(err);
          assert.equal(err, TEST_ERROR);
          done();
        });
      });

      it('sends namespace.get error to callback', function(done) {
        var TEST_ERROR = 'TEST_ERROR';
        follower._namespace.get = sandbox.stub().yields(TEST_ERROR);
        follower.initialize(function(err) {
          assert.ok(err);
          assert.equal(err, TEST_ERROR);
          done();
        });
      });

      it('throws when cb is not a function', function() {
        assert.exception(function() {
          follower.initialize('NOT A FUNCTION');
        }, 'URLFollow: A callback function must be passed');
      });

      it('sends error to cb when widget is initialized', function(done) {
        follower._isInitialized = true;
        follower.initialize(function(err) {
          assert.ok(err);
          assert.equal(err.message, 'URLFollow: Widget is already initialized');
          done();
        });
      });

      it('sends cross domain error to callback', function(done) {
        follower._lead = sandbox.stub().yields();
        follower._namespace.get = sandbox.stub().yields(null, {}, {});
        follower._room.self().get = sandbox.stub().yields(null, fakeUser, {});
        follower._isCrossDomain = sandbox.stub().returns(true);

        var ERROR_MESSAGE = 'URLFollow: Cross-Domain Init Denied';

        follower.initialize(function(err) {
          assert.ok(err);
          assert.equal(err.message, ERROR_MESSAGE);
          done();
        });
      });
    });
  });

  describe('#destroy', function() {

    beforeEach(function() {
      follower = new UrlFollower(fakeRoom);
    });

    it('runs on an initialized instance', function() {
      follower._isInitialized = true;
      follower._roomVersionKey.off = sinon.stub();
      follower.destroy(function(err) {
        assert.ifError(err);
        sinon.assert.calledOnce(follower._roomVersionKey.off);
      });
    });

    describe('errors', function() {

      it('throws when widget is not initialized', function(done) {
        follower._isInitialized = false;
        follower.destroy(function(err) {
          assert.ok(err);
          assert.equal(err.message, 'URLFollow: Widget is not yet initialized');
          done();
        });
      });
    });
  });

  describe('#getRoomVersion', function() {

    beforeEach(function() {
      follower = new UrlFollower(fakeRoom);
    });

    it('runs on an initialized instance', function() {
      follower._isInitialized = true;
      follower.followData = { version: 1 };
      var roomVersion = follower.getRoomVersion();
      assert.equal(roomVersion, follower.followData.version);
    });

    describe('errors', function() {

      it('throws when widget is not initialized', function() {
        follower._isInitialized = false;
        assert.exception(function() {
          follower.getRoomVersion();
        }, 'URLFollow: Widget is not yet initialized');
      });
    });
  });

  describe('#_validate', function() {

    beforeEach(function() {
      follower = new UrlFollower(fakeRoom);
    });

    it('succeeds when data is valid', function() {
      follower.followData = {
        url: { 0: {} },
        version: 0
      };
      follower.followData[fakeUser.id] = { version: 0 };
      follower.followUser = fakeUser;
      follower._validate();
    });

    describe('errors', function() {

      it('throws when user does not exist', function() {
        follower.followData = {};
        follower.followUser = undefined;
        assert.exception(function() {
          follower._validate(function() {});
        }, 'URLFollow: Error occurred during widget initialization');
      });

      it('throws when user does not have ID', function() {
        follower.followData = {};
        follower.followUser = {};
        assert.exception(function() {
          follower._validate(function() {});
        }, 'URLFollow: Error occurred during widget initialization');
      });
    });
  });

  describe('#_setup', function() {

    it('fixes !data[user.id] case', function() {
      follower.followData = {};
      follower.followUser = {id: fakeUser.id};
      follower._setup();
      assert.ok(follower.followData);
      assert.ok(follower.followData[fakeUser.id]);
      assert.deepEqual(follower.followData[fakeUser.id], { version: 0});
      assert.ok(follower.followData.url);
      assert.deepEqual(follower.followData.url, { 0: document.location.href });
      assert.equal(follower.followData.version, 0);
    });

    it('fixes !data[user.id].version case', function() {
      follower.followData = {};
      follower.followData[fakeUser.id] = {};
      follower.followUser = {id: fakeUser.id};
      follower._setup();
      assert.ok(follower.followData);
      assert.ok(follower.followData[fakeUser.id]);
      assert.deepEqual(follower.followData[fakeUser.id], { version: 0});
      assert.ok(follower.followData.url);
      assert.deepEqual(follower.followData.url, { 0: document.location.href });
      assert.equal(follower.followData.version, 0);
    });
  });

  describe('#_lead', function() {

    beforeEach(function() {
      follower = new UrlFollower(fakeRoom);
    });

    it('calls #_bindOnSet once leading functions completed', function(done) {
      follower._userVersionKey = sandbox.stub();
      follower._userVersionKey.set = sandbox.stub().yields();

      follower._bindOnSet = sandbox.stub();

      follower.followData = {version: 0, url: {}};
      follower.followUser = {id: fakeUser.id};

      follower._lead(function(err) {
        assert.ifError(err);
        sinon.assert.calledOnce(follower._bindOnSet);
        done();
      });
    });

    describe('errors', function() {

      it('navigates on roomLocation.set CollisionError', function(done) {
        var TEST_ERROR = new window.goinstant.errors.CollisionError();

        function locationFakeKey(name) {
          return {
            name: name,
            get: sandbox.stub().yields(),
            set: sandbox.stub().yields(
              TEST_ERROR, null, {userId: fakeUsers[1].id}
            ),
            key: locationFakeKey,
            remove: sandbox.stub().yields()
          };
        }

        follower._roomLocationKey.key = sandbox.stub();
        follower._roomLocationKey.key.returns(locationFakeKey());

        follower._setDocumentLocation = sandbox.stub();

        follower.followData = {version: 0, url: {}};
        follower.followUser = {id: fakeUser.id};

        follower._lead(function(err) {
          assert.ifError(err);
          sinon.assert.calledOnce(follower._setDocumentLocation);
          done();
        });
      });

      it('sends roomLocation.set error to callback', function(done) {
        var TEST_ERROR = 'TEST ERROR';

        function locationFakeKey(name) {
          return {
            name: name,
            get: sandbox.stub().yields(),
            set: sandbox.stub().yields(
              TEST_ERROR, null, {userId: fakeUsers[1].id}
            ),
            key: locationFakeKey,
            remove: sandbox.stub().yields()
          };
        }

        follower._roomLocationKey.key = sandbox.stub();
        follower._roomLocationKey.key.returns(locationFakeKey());

        follower.followData = {version: 0, url: {}};
        follower.followUser = {id: fakeUser.id};

        follower._lead(function(err) {
          assert.ok(err);
          assert.equal(err, TEST_ERROR);
          done();
        });
      });

      it('sends roomVersion.set error to callback', function(done) {
        var TEST_ERROR = 'TEST ERROR';
        follower._roomVersionKey.set = sandbox.stub().yields(TEST_ERROR);

        follower.followData = {version: 0, url: {}};
        follower.followUser = {id: fakeUser.id};

        follower._lead(function(err) {
          assert.ok(err);
          assert.equal(err, TEST_ERROR);
          done();
        });
      });

      it('sends userVersion.set error to callback', function(done) {
        var TEST_ERROR = 'TEST ERROR';
        follower._userVersionKey = sandbox.stub();
        follower._userVersionKey.set = sandbox.stub().yields(TEST_ERROR);

        follower.followData = {version: 0, url: {}};
        follower.followUser = {id: fakeUser.id};

        follower._lead(function(err) {
          assert.ok(err);
          assert.equal(err, TEST_ERROR);
          done();
        });
      });
    });
  });

  describe('#_follow', function() {

    beforeEach(function() {
      follower = new UrlFollower(fakeRoom);
    });

    it('calls #_bindOnSet via userVersion.set when up to date', function(done) {
      var TEST_URL = '#';
      follower._getDocumentLocation = sandbox.stub().returns(TEST_URL);
      follower._bindOnSet = sandbox.stub();

      follower._userVersionKey = {};
      follower._userVersionKey.set = sandbox.stub().yields();

      follower.followData = {version: 1, url: { 1: TEST_URL }};
      follower.followUser = {id: fakeUser.id};

      follower._follow(function(err) {
        assert.ifError(err);
        sinon.assert.calledOnce(follower._bindOnSet);
        done();
      });
    });

    it('calls #_setDocumentLocation when behind on follow', function(done) {
      var TEST_URL = '#';
      var DIFFERENT_URL = '##';
      follower._getDocumentLocation = sandbox.stub().returns(TEST_URL);
      follower._setDocumentLocation = sandbox.stub();

      follower._userVersionKey = {};
      follower._userVersionKey.set = sandbox.stub().yields();

      follower.followData = { version: 1, url: { 1: DIFFERENT_URL } };
      follower.followUser = {};

      follower._follow(function(err) {
        assert.ifError(err);
        sinon.assert.calledOnce(follower._setDocumentLocation);
        done();
      });
    });

    describe('errors', function() {

      it('sends userVersion.set error to callback', function(done) {
        var TEST_URL = '#';
        var TEST_ERROR = 'TEST_ERROR';
        follower._getDocumentLocation = sandbox.stub().returns(TEST_URL);

        follower._userVersionKey = {};
        follower._userVersionKey.set = sandbox.stub().yields(TEST_ERROR);

        follower.followData = { version: 1, url: { 1: TEST_URL } };
        follower.followUser = {};

        follower._follow(function(err) {
          assert.ok(err);
          assert.equal(err, TEST_ERROR);
          done();
        });
      });
    });
  });

  describe('#_bindOnSet', function() {

    beforeEach(function() {
      follower = new UrlFollower(fakeRoom);
    });

    it('ignores sets made by self', function(done) {
      follower._roomVersionKey.on =
        sandbox.stub().yields(0, { userId: fakeUser.id});

      follower.followUser = { id: fakeUser.id };
      follower._bindOnSet();
      done();
    });

    it('refreshes when set is the same URL', function(done) {
      var TEST_URL = 'http://www.goinstant.com';
      function locationFakeKey(name) {
        return {
          name: name,
          get: sandbox.stub().yields(null, TEST_URL),
          set: sandbox.stub().yields(),
          key: locationFakeKey,
          remove: sandbox.stub().yields()
        };
      }

      follower._roomLocationKey.key = sandbox.stub();
      follower._roomLocationKey.key.returns(locationFakeKey());
      follower._getDocumentLocation = sandbox.stub().returns(TEST_URL);

      follower._roomVersionKey.on =
        sandbox.stub().yields(0, { userId: fakeUser.id});
      follower._refreshDocumentLocation = sandbox.stub();

      follower.followUser = { id: fakeUsers[1].id };

      follower._bindOnSet();
      sinon.assert.calledOnce(follower._refreshDocumentLocation);
      done();
    });

    it('navigates when set is a different URL', function(done) {
      var TEST_URL = 'http://www.goinstant.com';
      var DIFFERENT_URL = 'http://www.goinstant.com/path';
      function locationFakeKey(name) {
        return {
          name: name,
          get: sandbox.stub().yields(null, DIFFERENT_URL),
          set: sandbox.stub().yields(),
          key: locationFakeKey,
          remove: sandbox.stub().yields()
        };
      }

      follower._roomLocationKey.key = sandbox.stub();
      follower._roomLocationKey.key.returns(locationFakeKey());
      follower._getDocumentLocation = sandbox.stub().returns(TEST_URL);

      follower._roomVersionKey.on =
        sandbox.stub().yields(0, { userId: fakeUser.id});
      follower._setDocumentLocation = sandbox.stub();

      follower.followUser = { id: fakeUsers[1].id };

      follower._bindOnSet();
      sinon.assert.calledOnce(follower._setDocumentLocation);
      done();
    });

    describe('errors', function() {

      it('sends roomLocation.get error to callback', function(done) {
        var TEST_ERROR = new Error('TEST ERROR');
        function locationFakeKey(name) {
          return {
            name: name,
            get: sandbox.stub().yields(TEST_ERROR),
            set: sandbox.stub().yields(),
            key: locationFakeKey,
            remove: sandbox.stub().yields()
          };
        }

        follower._roomLocationKey.key = sandbox.stub();
        follower._roomLocationKey.key.returns(locationFakeKey());

        follower._roomVersionKey.on =
          sandbox.stub().yields(0, { userId: fakeUser.id});

        follower.followUser = { id: fakeUsers[1].id };

        assert.exception(function() {
          follower._bindOnSet();
        }, 'TEST ERROR');
        done();
      });

      it('throws if URL sent is cross-domain', function() {
        var TEST_URL = 'https://test.com';
        var DIFFERENT_URL = 'http://test123.com:81';
        function locationFakeKey(name) {
          return {
            name: name,
            get: sandbox.stub().yields(null, DIFFERENT_URL),
            set: sandbox.stub().yields(),
            key: locationFakeKey,
            remove: sandbox.stub().yields()
          };
        }

        follower._roomLocationKey.key = sandbox.stub();
        follower._roomLocationKey.key.returns(locationFakeKey());
        follower._getDocumentLocation = sandbox.stub().returns(TEST_URL);

        follower._roomVersionKey.on =
          sandbox.stub().yields(0, { userId: fakeUser.id});
        follower._refreshDocumentLocation = sandbox.stub();

        follower.followUser = { id: fakeUsers[1].id };

        assert.exception(function() {
          follower._bindOnSet();
        }, 'URLFollow: Unauthorized Cross-Domain Request Made');
      });
    });
  });

  describe('#_isCrossDomain', function() {

    beforeEach(function() {
      follower = new UrlFollower(fakeRoom);
      var currentUrl = 'https://www.goinstant.com:80';
      follower._getDocumentLocation = sandbox.stub().returns(currentUrl);
    });

    it('returns true when port does not match', function() {
      assert.isTrue(follower._isCrossDomain('https://www.goinstant.com:81'));
    });
    it('returns true when host does not match', function() {
      assert.isTrue(follower._isCrossDomain('https://www.salesforce.com:80'));
    });
    it('returns true when protocol does not match', function() {
      assert.isTrue(follower._isCrossDomain('http://www.goinstant.com:80'));
    });
    it('returns false when port, host and protocol match', function() {
      assert.isFalse(follower._isCrossDomain('https://www.goinstant.com:80'));
    });
    it('returns false when port is empty & host + protocol match', function() {
      var modifiedUrl = 'https://www.goinstant.com';
      follower._getDocumentLocation = sandbox.stub().returns(modifiedUrl);
      assert.isFalse(follower._isCrossDomain('https://www.goinstant.com'));
    });
  });
});
