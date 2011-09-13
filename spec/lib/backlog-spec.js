(function() {
  var assert, h, op, suite, vows;
  vows = require("vows");
  assert = require('assert');
  op = require("../src/op-sync");
  h = require('./helpers');
  suite = vows.describe("backlog");
  suite.addBatch({
    "maintain a local backlog for field change": {
      "without compression": {
        topic: function() {
          var obj;
          obj = new h.MockModel();
          obj.set({
            field1: 1,
            field2: 2,
            field3: 3
          });
          return obj;
        },
        "backlog exists": function(t) {
          return assert.isDefined(t.instance.backlog);
        },
        "backlog contains 3 fields": function(t) {
          return assert.equal(t.instance.backlog.length, 3);
        },
        "backlog contains transformations": function(t) {
          var tr, _i, _len, _ref, _results;
          _ref = t.instance.backlog;
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
            _ref = t.instance.sync_log.get_backlog();
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
          obj = new h.MockModel({
            id: 1,
            model: "mock"
          });
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
          return assert.isDefined(t.instance.backlog);
        },
        "backlog contains 4 fields": function(t) {
          return assert.equal(t.instance.backlog.length, 4);
        },
        "backlog for field 1 contains latest data": function(t) {
          var tr, _i, _len, _ref, _results;
          _ref = t.instance.backlog;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            tr = _ref[_i];
            _results.push(tr.field === "field1" ? assert.equal(tr.data, 2) : void 0);
          }
          return _results;
        },
        "backlog contains transformations": function(t) {
          var tr, _i, _len, _ref, _results;
          _ref = t.instance.backlog;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            tr = _ref[_i];
            _results.push(assert.equal(tr.operation, "fld"));
          }
          return _results;
        }
      }
    }
  });
  suite["export"](module);
}).call(this);
