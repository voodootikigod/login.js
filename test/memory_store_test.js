var vows = require('vows'),
    assert = require('assert');
    
var memoryStore = require("../lib/memory_store")();  //execute with no options

vows.describe("Memory Store").addBatch({
  "when we get a value that is not set": {
    topic: "EMPTYKEY",
    "we get undefined as the return": function (topic)  {
      memoryStore.get(topic, function(val) {
        assert.isUndefined(val);
      });
    }
  },
  "when only value set": {
    topic: function () {
      memoryStore.set("sadklfjlkasdjflsdjl", "5");
      return "sadklfjlkasdjflsdjl";
    },
    "we get the value same value": function (topic) {
      memoryStore.get(topic, function(val)  {
        assert.equal("5", val);
      })
    }
  },
  "when memory store is full": {
    topic: function () {
      var i;
      for(i =0; i< 100; i++) { memoryStore.set(""+i, ""+(i+1)); }
      return i;
    },
    "requesting back will always return the specified value": function (topic) {
      var i;
      for (i =0; i< topic; i++) {
        memoryStore.get(""+i, function(val) {
          assert.equal(""+(i+1), val);
        }); 
      }
    }
  },
  "when deleteing key": {
    topic: function() {
      var topic = "DELKEY";
      memoryStore.set(topic, topic);
      return topic;
    },
    "the value is always undefined": function (topic) {
      memoryStore.del(topic);
      memoryStore.get(topic, function(val) {
        assert.isUndefined(val);
      });
    }
  }
}).export(module)