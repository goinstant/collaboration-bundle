/*jshint browser:true*/
/*global require*/
describe('Collapse Cookie', function() {
  'use strict';

  var sinon = window.sinon;
  var assert = window.assert;

  var CollapseCookie = require('collaboration-bundle/lib/collapse_cookie');

  var sandbox;
  var fakeCookieVal;
  var fakeCookie = function(cookie, value) {
    if (value === undefined) {
      return fakeCookieVal;
    }
    fakeCookieVal = value;
  };

  var cookieName = 'goinstant-collaboration-bundle-collapse';

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    fakeCookieVal = undefined;
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('methods', function() {

    var collapseCookie;

    beforeEach(function() {
      collapseCookie = new CollapseCookie();
      CollapseCookie.cookie = fakeCookie;
    });

    describe('#get', function() {
      it('returns the value of the cookie', function() {
        collapseCookie.create();
        // Sets value directly as to not rely on #set
        fakeCookieVal = 'FAKE_COOKIE';
        assert.equal(collapseCookie.get(), fakeCookieVal);
      });
    });

    describe('#set', function() {
      it('changes the cookie value to the provided value', function() {
        sandbox.spy(CollapseCookie, 'cookie');

        var TEST_VAL = 'TestValue';
        collapseCookie.create();
        collapseCookie.set(TEST_VAL);

        sinon.assert.calledWith(CollapseCookie.cookie, cookieName, TEST_VAL);
      });
    });

    describe('#destroy', function() {
      it('removes the cookie when called', function() {
        collapseCookie.create();
        assert.ok(collapseCookie.isSet());
        collapseCookie.destroy();
        assert.notOk(collapseCookie.isSet());
      });
    });

    describe('#create', function() {
      it('creates a cookie', function() {
        sandbox.spy(CollapseCookie, 'cookie');
        collapseCookie.create();
        sinon.assert.calledWith(CollapseCookie.cookie, cookieName, 'open');
      });

      describe('errors', function() {
        it('errors on a cookie that has already been created', function() {
          collapseCookie.create();

          assert.exception(function() {
            collapseCookie.create();
          }, 'Should not create session cookie when already set');
        });
      });
    });

    describe('#isSet', function() {
      it('returns false when no cookie exists', function() {
        assert.notOk(collapseCookie.isSet());
      });

      it('returns true when a cookie exists', function() {
        collapseCookie.create();
        assert.ok(collapseCookie.isSet());
      });
    });

  });
});
