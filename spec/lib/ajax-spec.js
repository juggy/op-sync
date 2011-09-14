var assert, h, op, suite, vows, _;
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
vows = require("vows");
assert = require('assert');
_ = require("underscore");
op = require("../src/op-sync");
h = require('./helpers');
suite = vows.describe("ajax");
suite.addBatch({
  "successful sync of a single object from backend": {
    topic: function() {
      var device, obj;
      obj = new h.MockModel;
      device = obj.device;
      device.events.update = __bind(function(model, id, fields) {
        return this.callback(device, model, id, fields);
      }, this);
      device.ajax = __bind(function(params) {
        return params.success([
          {
            operation: "cfn"
          }, {
            operation: "fld",
            model: "mock",
            id: 1,
            field: "field1",
            data: 0
          }, {
            operation: "syc"
          }
        ]);
      }, this);
      device.sync_log.sync_backlog();
      return;
    },
    "update should be called with the changed data from backend": function(device, model, id, fields) {
      assert.equal(model, "mock");
      assert.equal(id, 1);
      return assert.equal(fields.field1, 0);
    },
    "the backlog should contain the confirmation": function(device, model, id, fields) {
      var _ref;
      assert.equal(device.sync_log.backlog.length, 1);
      return assert.equal((_ref = _.last(device.sync_log.backlog)) != null ? _ref.operation : void 0, "cfn");
    }
  },
  "successful sync of many objects": {
    topic: function() {
      var device, obj1, obj2, updates;
      obj1 = new h.MockModel;
      device = obj1.device;
      obj2 = new h.MockModel({
        model: "mock2",
        id: 1
      }, device);
      updates = [];
      device.events.update = function() {
        return updates.push(arguments);
      };
      device.ajax = __bind(function(params) {
        params.success([
          {
            operation: "cfn"
          }, {
            operation: "syc"
          }
        ]);
        return this.callback(device, updates, params.data);
      }, this);
      obj1.set({
        field1: 1
      }, false);
      obj2.set({
        field1: 3
      }, false);
      return device.sync_log.sync_backlog();
    },
    "update should not be called": function(device, updates, backend) {
      return assert.equal(updates.length, 0);
    },
    "backend should receive data": function(device, updates, backend) {
      backend = JSON.parse(backend);
      assert.equal(backend.length, 3);
      assert.equal(backend[0].model, "mock");
      assert.equal(backend[0].id, 1);
      assert.equal(backend[0].field, "field1");
      assert.equal(backend[0].data, 1);
      assert.equal(backend[1].model, "mock2");
      assert.equal(backend[1].id, 1);
      assert.equal(backend[1].field, "field1");
      return assert.equal(backend[1].data, 3);
    },
    "reset whould void the backlog": function(device, updates, backend) {
      var _ref;
      assert.equal(device.sync_log.backlog.length, 1);
      return assert.equal((_ref = _.last(device.sync_log.backlog)) != null ? _ref.operation : void 0, "cfn");
    }
  },
  "update the object while it is syncing": {
    topic: function() {
      var call, device, locked, obj, obj_fields;
      obj = new h.MockModel;
      device = obj.device;
      obj_fields = {};
      locked = true;
      call = 0;
      device.events.update = function(model, id, fields) {
        return obj.fields = _.extend(obj.fields, fields);
      };
      device.ajax = __bind(function(params) {
        var sleep;
        if (call === 0) {
          sleep = __bind(function() {
            if (locked) {
              return setTimeout(sleep, 1);
            } else {
              params.success([
                {
                  operation: "cfn"
                }, {
                  operation: "syc"
                }
              ]);
              return call = 2;
            }
          }, this);
          return sleep();
        } else {
          sleep = __bind(function() {
            if (call === 1) {
              return setTimeout(sleep, 1);
            } else {
              params.success([
                {
                  operation: "cfn"
                }, {
                  operation: "syc"
                }
              ]);
              return this.callback(obj);
            }
          }, this);
          return sleep();
        }
      }, this);
      obj.set({
        field1: 1
      });
      call = 1;
      obj.set({
        field1: 3
      });
      locked = false;
      return;
    },
    "the final object value must equal 3": function(obj, fields) {
      return assert.equal(obj.fields.field1, 3);
    },
    "the backlog should contain the confirmation": function(obj, fields) {
      return assert.equal(obj.device.sync_log.backlog.length, 1);
    }
  },
  "update the object while it is syncing with server delta": {
    topic: function() {
      var call, device, locked, obj, obj_fields;
      obj = new h.MockModel;
      device = obj.device;
      obj_fields = {};
      locked = true;
      call = 0;
      device.events.update = function(model, id, fields) {
        return obj.fields = _.extend(obj.fields, fields);
      };
      device.ajax = __bind(function(params) {
        var sleep;
        if (call === 0) {
          sleep = __bind(function() {
            if (locked) {
              return setTimeout(sleep, 1);
            } else {
              params.success([
                {
                  operation: "cfn"
                }, {
                  operation: "fld",
                  model: "mock",
                  id: 1,
                  field: "field1",
                  data: 0
                }, {
                  operation: "syc"
                }
              ]);
              return call = 2;
            }
          }, this);
          return sleep();
        } else {
          sleep = __bind(function() {
            if (call === 1) {
              return setTimeout(sleep, 1);
            } else {
              params.success([
                {
                  operation: "cfn"
                }, {
                  operation: "fld",
                  model: "mock",
                  id: 1,
                  field: "field1",
                  data: 4
                }, {
                  operation: "syc"
                }
              ]);
              return this.callback(obj);
            }
          }, this);
          return sleep();
        }
      }, this);
      obj.set({
        field1: 1
      });
      call = 1;
      obj.set({
        field1: 3
      });
      locked = false;
      return;
    },
    "the final object value must equal 4": function(obj, fields) {
      return assert.equal(obj.fields.field1, 4);
    },
    "the backlog should contain the confirmation": function(obj, fields) {
      return assert.equal(obj.device.sync_log.backlog.length, 1);
    }
  }
});
suite["export"](module);