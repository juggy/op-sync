vows = require( "vows" )
assert = require( 'assert' )
op = require( "../src/op-sync")

class MockModel extends op.ModelMixin
  constructor: (@model_name = "mock")->
  id: 1
  set: (fields)->
    @sync_fields(fields)

class MockJQuery
  callback: null
  ajax: (params)->
    callback(params)

global.$ = new MockJQuery

suite = vows.describe("client")
batch = suite.addBatch
  "maintain a local backlog for field change" :
    "without compression":
      topic: ->
        obj = new MockModel()
        obj.set
          field1: 1
          field2: 2
          field3: 3
        obj
      "backlog exists": (t)->
        assert.isDefined t._op_sync.backlog
      "backlog contains 3 fields": (t)->
        assert.equal t._op_sync.backlog.length, 3
      "backlog contains transformations": (t)->
        for tr in t._op_sync.backlog
          assert.equal tr.operation, "fld"
      "global backlog contains op": (t)->
        assert.equal (tr for tr in op._gsync.get_backlog() when tr.model is t.model_name and tr.id is t.id).length, 3 
    "with compression":
      topic: ->
        obj = new MockModel()
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
        assert.isDefined t._op_sync.backlog
      "backlog contains 4 fields": (t)->
        assert.equal t._op_sync.backlog.length, 4
      "backlog for field 1 contains latest data": (t)->
        for tr in t._op_sync.backlog
          assert.equal tr.data, 2 if tr.field is "field1"
      "backlog contains transformations": (t)->
        for tr in t._op_sync.backlog
          assert.equal tr.operation, "fld"
  "sync the complete backlog":
    topic: ->
      
suite.export(module)