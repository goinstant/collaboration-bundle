/*jshint browser:true*/
/*global require*/
describe('Invite URL', function() {
  'use strict';

  var sinon = window.sinon;
  var assert = window.assert;

  var inviteUrl = require('collaboration-bundle/lib/invite_url');

  var URL_WITH_ANCHOR = 'http://www.test.com/#test';
  var URL_WITHOUT_ANCHOR = 'http://www.test.com/';

  var TEST_UUID = '1ee23520-35c7-4515-96a3-d5d0015a8113';

  var getLocation;

  var sandbox;
  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('#generate', function() {

    beforeEach(function() {
      getLocation = sandbox.stub(inviteUrl, '_getLocation');
    });

    it('generates properly with no existing anchor', function() {
      getLocation.returns(URL_WITHOUT_ANCHOR);

      var generatedUrl = inviteUrl.generate(TEST_UUID);

      assert.equal(
        generatedUrl,
        URL_WITHOUT_ANCHOR + '#gi-cb-sess=' + TEST_UUID
      );
    });

    it('generates properly with an existing anchor', function() {
      getLocation.returns(URL_WITH_ANCHOR);

      var generatedUrl = inviteUrl.generate(TEST_UUID);

      assert.equal(
        generatedUrl,
        URL_WITH_ANCHOR + '&gi-cb-sess=' + TEST_UUID
      );
    });
  });

  describe('#retrieve', function() {

    beforeEach(function() {
      getLocation = sandbox.stub(inviteUrl, '_getLocation');
    });

    it('returns null with no sessId', function() {
      getLocation.returns(URL_WITHOUT_ANCHOR);

      assert.equal(null, inviteUrl.retrieve());
    });

    it('returns null with another anchor and no sessId', function() {
      getLocation.returns(URL_WITH_ANCHOR);

      assert.equal(null, inviteUrl.retrieve());
    });

    it('retrieves properly with only sessionId as anchor', function() {
      getLocation.returns(URL_WITHOUT_ANCHOR);
      var generatedUrl = inviteUrl.generate(TEST_UUID);

      getLocation.returns(generatedUrl);

      assert.equal(TEST_UUID, inviteUrl.retrieve());
    });

    it('retrieves properly with more than one anchor', function() {
      getLocation.returns(URL_WITH_ANCHOR);
      var generatedUrl = inviteUrl.generate(TEST_UUID);

      getLocation.returns(generatedUrl);

      assert.equal(TEST_UUID, inviteUrl.retrieve());
    });
  });

  describe('#_getLocation', function() {

    it('returns the current window location', function() {
      assert.equal(inviteUrl._getLocation(), window.location.href);
    });
  });

});
