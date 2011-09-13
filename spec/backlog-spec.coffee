vows = require( "vows" )
assert = require( 'assert' )
op = require( "../src/op-sync")
h = require('./helpers')

suite = vows.describe("backlog")
suite.addBatch
  "maintain a local backlog for field change" :
    "without compression":
      topic: ->
        obj = new h.MockModel()
        obj.set
          field1: 1
          field2: 2
          field3: 3
        obj
      "backlog exists": (t)->
        assert.isDefined t.instance.backlog
      "backlog contains 3 fields": (t)->
        assert.equal t.instance.backlog.length, 3
      "backlog contains transformations": (t)->
        for tr in t.instance.backlog
          assert.equal tr.operation, "fld"
      "global backlog contains op": (t)->
        assert.equal t.instance.sync_log.get_backlog().length, 3 
    "with compression":
      topic: ->
        obj = new h.MockModel {id: 1, model: "mock"}
        obj.id = 2
        obj.set
          field1: 1
          field2: 2
          field3: 3
        obj.set
          field1: 2
          field4: 4
        obj
      "backlog exists": (t)->
        assert.isDefined t.instance.backlog
      "backlog contains 4 fields": (t)->
        assert.equal t.instance.backlog.length, 4
      "backlog for field 1 contains latest data": (t)->
        for tr in t.instance.backlog
          assert.equal tr.data, 2 if tr.field is "field1"
      "backlog contains transformations": (t)->
        for tr in t.instance.backlog
          assert.equal tr.operation, "fld"
suite.export(module)