/*jshint browser:true*/
/*global require*/
describe('Session Cookie', function() {
  'use strict';

  var sinon = window.sinon;
  var assert = window.assert;

  var SessionCookie = require('collaboration-bundle/lib/session_cookie');

  var sandbox;
  var fakeCookieVal;
  var fakeCookie = function(cookie, value) {
    if (value === undefined) {
      return fakeCookieVal;
    }
    fakeCookieVal = value;
  };

  var cookieName = 'goinstant-collaboration-bundle-session';

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    fakeCookieVal = undefined;
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('methods', function() {

    var sessionCookie;

    beforeEach(function() {
      sessionCookie = new SessionCookie();
      SessionCookie.cookie = fakeCookie;
    });

    describe('#get', function() {
      it('returns the value of the cookie', function() {
        sessionCookie.create();
        // Sets value directly as to not rely on #set
        fakeCookieVal = 'FAKE_COOKIE';
        assert.equal(sessionCookie.get(), fakeCookieVal);
      });
    });

    describe('#set', function() {
      it('changes the cookie value to the provided value', function() {
        sandbox.spy(SessionCookie, 'cookie');

        var TEST_VAL = 'TestValue';
        sessionCookie.create();
        sessionCookie.set(TEST_VAL);

        sinon.assert.calledWith(SessionCookie.cookie, cookieName, TEST_VAL);
      });
    });

    describe('#destroy', function() {
      it('removes the cookie when called', function() {
        sessionCookie.create();
        assert.ok(sessionCookie.isSet());
        sessionCookie.destroy();
        assert.notOk(sessionCookie.isSet());
      });
    });

    describe('#create', function() {
      it('creates a cookie', function() {
        sessionCookie.create();
      });

      describe('errors', function() {
        it('errors on a cookie that has already been created', function() {
          sessionCookie.create();

          assert.exception(function() {
            sessionCookie.create();
          }, 'Should not create session cookie when already set');
        });
      });
    });

    describe('#isSet', function() {
      it('returns false when no cookie exists', function() {
        assert.notOk(sessionCookie.isSet());
      });

      it('returns true when a cookie exists', function() {
        sessionCookie.create();
        assert.ok(sessionCookie.isSet());
      });
    });

  });
});
