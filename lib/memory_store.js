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
    get: function(key) {
      return authenticated[key];
    },
    store: function(key, id) {
      authenticated[key] = id
    },
    expire: function(key) {
      delete authenticated[key];
    }
  }
});
