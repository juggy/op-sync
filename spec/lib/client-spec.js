(function() {
  var MockJQuery, MockModel, assert, batch, op, suite, vows;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  vows = require("vows");
  assert = require('assert');
  op = require("../src/op-sync");
  MockModel = (function() {
    __extends(MockModel, op.ModelMixin);
    function MockModel(model_name) {
      this.model_name = model_name != null ? model_name : "mock";
    }
    MockModel.prototype.id = 1;
    MockModel.prototype.set = function(fields) {
      return this.sync_fields(fields);
    };
    return MockModel;
  })();
  MockJQuery = (function() {
    function MockJQuery() {}
    MockJQuery.prototype.callback = null;
    MockJQuery.prototype.ajax = function(params) {
      return callback(params);
    };
    return MockJQuery;
  })();
  global.$ = new MockJQuery;
  suite = vows.describe("client");
  batch = suite.addBatch({
    "maintain a local backlog for field change": {
      "without compression": {
        topic: function() {
          var obj;
          obj = new MockModel();
          obj.set({
            field1: 1,
            field2: 2,
            field3: 3
          });
          return obj;
        },
        "backlog exists": function(t) {
          return assert.isDefined(t._op_sync.backlog);
        },
        "backlog contains 3 fields": function(t) {
          return assert.equal(t._op_sync.backlog.length, 3);
        },
        "backlog contains transformations": function(t) {
          var tr, _i, _len, _ref, _results;
          _ref = t._op_sync.backlog;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            tr = _ref[_i];
            _results.push(assert.equal(tr.operation, "fld"));
          }
          return _results;
        },
        "global backlog contains op": function(t) {
          var tr;
          return assert.equal(((function() {
            var _i, _len, _ref, _results;
            _ref = op._gsync.get_backlog();
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              tr = _ref[_i];
              if (tr.model === t.model_name && tr.id === t.id) {
                _results.push(tr);
              }
            }
            return _results;
          })()).length, 3);
        }
      },
      "with compression": {
        topic: function() {
          var obj;
          obj = new MockModel();
          obj.id = 2;
          obj.set({
            field1: 1,
            field2: 2,
            field3: 3
          });
          obj.set({
            field1: 2,
            field4: 4
          });
          return obj;
        },
        "backlog exists": function(t) {
          return assert.isDefined(t._op_sync.backlog);
        },
        "backlog contains 4 fields": function(t) {
          return assert.equal(t._op_sync.backlog.length, 4);
        },
        "backlog for field 1 contains latest data": function(t) {
          var tr, _i, _len, _ref, _results;
          _ref = t._op_sync.backlog;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            tr = _ref[_i];
            _results.push(tr.field === "field1" ? assert.equal(tr.data, 2) : void 0);
          }
          return _results;
        },
        "backlog contains transformations": function(t) {
          var tr, _i, _len, _ref, _results;
          _ref = t._op_sync.backlog;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            tr = _ref[_i];
            _results.push(assert.equal(tr.operation, "fld"));
          }
          return _results;
        }
      }
    },
    "sync the complete backlog": {
      topic: function() {}
    }
  });
  suite["export"](module);
}).call(this);
