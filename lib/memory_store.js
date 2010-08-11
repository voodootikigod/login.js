/*!
 * connect-auth: MemoryStore
 * Copyright(c) 2010 Chris Williams (@voodootikigod)
 * MIT Licensed
 *
 * In-memory storage for active authenticated sessions.
 */

module.exports = (function() {
  var authenticated = {};
  return {
    get: function(key, callback) {
      callback(authenticated[""+key]);
    },
    set: function(key, id) {
      authenticated[""+key] = ""+id
    },
    del: function(key) {
      delete authenticated[""+key];
    }
  }
});
