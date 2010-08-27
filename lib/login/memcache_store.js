/*!
 * connect-auth: MemcacheStore
 * Copyright(c) 2010 Chris Williams (@voodootikigod)
 * MIT Licensed
 *
 * Storage for active authenticated sessions using Memcached.
 */

var Memcache = require(__dirname + '/../vendor/memcachejs/memcache');
Memcache.pooling = false;


module.exports = (function(host, port, options) {
  if (typeof host !== "string") { host = "localhost" }
  if (typeof port !== "number") { port = 11211 }
  if (typeof options !== "object") { options = {} }
  if (typeof options.lifetime !== "number") { options.lifetime = 2591999;}
  
  var connection = new Memcache(host, port);
  return {
    get: function(key, callback) {
      connection.get(""+key, function(response) {
        callback(response.data);
      });
    },
    set: function(key, id) {
      connection.set(""+key, ""+id, {expires: options.lifetime });
    },
    del: function(key) {
      connection.del(""+key);
    },
    close: function() {
      Memcache.prototype.shutdown();
    }
  }
});
