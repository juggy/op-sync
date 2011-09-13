(function() {
  var assert, h, op, suite, vows;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  vows = require("vows");
  assert = require('assert');
  op = require("../src/op-sync");
  h = require('helpers');
  suite = vows.describe("device");
  suite.addBatch({
    "create a totally new device": {
      topic: function() {
        var dev;
        return dev = new op.Device({
          ajax: __bind(function(params) {
            return this.callback(dev, params);
          }, this)
        });
      },
      "params should contain the registration information": function(device, params) {
        return assert.equal(device.uuid, params.registration);
      },
      "store should contain a reference to the device": function(device, params) {
        assert.isDefined(device.store.get(device.uuid));
        return assert.equal(device.uuid, device.store.get("op.device.uuid"));
      },
      "store should contain a an empty backlog": assert.equal(device.store.get(device.uuid).length, 0)
    },
    "reuse an existing device": {
      topic: function() {
        var store;
        store = new op.Interfaces.Persistence;
        store.set("op.device.uuid", 1);
        store.set(1, []);
        return new op.Device({
          persistence: store
        });
      },
      "device should use previous device": function(dev) {
        return assert.equal(dev.uuid, 1);
      }
    }
  });
  suite["export"](module);
}).call(this);
