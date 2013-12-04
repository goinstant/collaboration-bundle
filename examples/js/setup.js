var Bundle = require('collaboration-bundle');
// Connect to GoInstant Platform
var bundle = new Bundle({
  connectUrl: config.connectUrl
});
bundle.initialize(function(err) {
  if (err) {
    console.log(err.message);
  }
  console.log('SUCCESS');
});
