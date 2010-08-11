var vows = require('vows'),
    sys = require("sys"),
    assert = require('assert');
    
var memcacheStore = require("../lib/memcache_store")();  //execute with no options

vows.describe("Memcache Store").addBatch({
  "when we get a value that is not set": {
      topic: "EMPTYKEY",
      "we get undefined as the return": function (topic)  {
        memcacheStore.get(topic, function(val) { 
          assert.isUndefined(val)
        });
      }
    },
  "when only value set": {
    topic: function () { 
      memcacheStore.set("SETVALUE", "5");
      return "SETVALUE"; 
    },
    "we get the value same value": function (topic) {
      memcacheStore.get(topic, function(val)  {
        assert.equal("5", val);
      });
    }
  },  
  "when memory store is full": {
    topic: function () {
      var i;
      for(i =0; i< 100; i++) { memcacheStore.set(new String(i), i+1); }
      return i;
    },
    "requesting back will always return the specified value": function (topic) {
      var i;
      for (i =0; i< topic; i++) {
        memcacheStore.get(new String(i), function(val){
          assert.equal(new String(i+1), val);
        }); 
      }
    }
  },
  "when deleteing key": {
    topic: function() {
      var topic = "DELKEY"
      memcacheStore.set(topic, topic);
      return topic;
    },
    "the value is always undefined": function (topic) {
      memcacheStore.del(topic);
      memcacheStore.get(topic, function(val) {
        assert.isUndefined(val);
      });
    }
  }
  // ,
  // "when close": {
  //   topic: function() {
  //     memcacheStore.close();
  //     return 0;
  //   }, "should shutdown": function(topic) {
  //     sys.p("closed")
  //   }
  // }
}).export(module);