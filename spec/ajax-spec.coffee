vows = require( "vows" )
assert = require( 'assert' )
_ = require("underscore")
op = require( "../src/op-sync")
h = require('./helpers')

suite = vows.describe("ajax")
suite.addBatch
  "successful sync of a single object from backend" : 
    topic: -> 
      obj = new h.MockModel
      device = obj.device
      device.events.update = (model, id, fields)=> @callback(device, model, id, fields)
      device.ajax = (params) =>
        params.success [{operation: "cfn"}, {operation: "fld", model: "mock", id: 1, field: "field1", data: 0}, {operation: "syc"}]

      device.sync_log.sync_backlog()
      undefined
    "update should be called with the changed data from backend" : (device, model, id, fields)->
      assert.equal model, "mock"
      assert.equal id, 1
      assert.equal fields.field1, 0
    "the backlog should contain the confirmation" : (device, model, id, fields)-> 
      assert.equal device.sync_log.backlog.length, 1
      assert.equal _.last( device.sync_log.backlog )?.operation, "cfn"

  "successful sync of many objects" :
    topic: ->
      obj1 = new h.MockModel
      device = obj1.device
      obj2 = new h.MockModel {model : "mock2", id: 1}, device
      updates = []
      device.events.update = -> updates.push arguments
      device.ajax = (params) =>
        params.success [{operation: "cfn"}, {operation: "syc"}]
        @callback(device, updates, params.data)
      
      obj1.set
        field1: 1
      , false
      obj2.set
        field1: 3
      , false

      device.sync_log.sync_backlog()
      undefined
    "update should not be called" : (device, updates, backend)->
      assert.equal updates.length, 0
    "backend should receive data" : (device, updates, backend) ->
      backend = JSON.parse backend
      assert.equal backend.length, 3
      assert.equal backend[0].model, "mock"
      assert.equal backend[0].id, 1
      assert.equal backend[0].field, "field1"
      assert.equal backend[0].data, 1
      assert.equal backend[1].model, "mock2"
      assert.equal backend[1].id, 1
      assert.equal backend[1].field, "field1"
      assert.equal backend[1].data, 3
    "reset whould void the backlog" : (device, updates, backend)->
      assert.equal device.sync_log.backlog.length, 1
      assert.equal _.last( device.sync_log.backlog )?.operation, "cfn"

  "error sync": 
    topic: ->
      obj = new h.MockModel
      device = obj.device
      device.ajax = (params) =>
        #params.error {}
        @callback(device.sync_log.backlog.length, _.last device.sync_log.backlog)

      device.sync_log.sync_backlog()
      undefined

    "backlog should not be changed": (l, last)->
      assert.equal l, 1
      assert.equal last.operation, "syc"

  "update the object while it is syncing": 
    topic: ->
      obj = new h.MockModel
      device = obj.device
      # device.debug = true
      obj_fields = {}
      locked = true
      call = 0
      device.events.update = (model, id, fields)-> obj.fields = _.extend obj.fields, fields
      device.ajax = (params) =>
        # block on the ajax call
        if call is 0
          sleep = =>
            if locked
              setTimeout sleep, 1
            else
              params.success [{operation: "cfn"}, {operation: "syc"}] # no op from backend
              call = 2
          sleep()
        else
          sleep = =>
            if call is 1
              setTimeout sleep, 1
            else 
              params.success [{operation: "cfn"}, {operation: "syc"}]
              @callback(obj)
          sleep()
      # set will trigger a sync
      obj.set
        field1: 1
      call = 1
      obj.set
        field1: 3
      # unlock ajax
      locked = false
      undefined
    "the final object value must equal 3" : (obj, fields)->
      assert.equal obj.fields.field1, 3
    "the backlog should contain the confirmation" : (obj, fields)->
      assert.equal obj.device.sync_log.backlog.length , 1
  "update the object while it is syncing with server delta": 
    topic: ->
      obj = new h.MockModel
      device = obj.device
      # device.debug = true
      obj_fields = {}
      locked = true
      call = 0
      device.events.update = (model, id, fields)-> obj.fields = _.extend obj.fields, fields
      device.ajax = (params) =>
        # block on the ajax call
        if call is 0
          sleep = =>
            if locked
              setTimeout sleep, 1
            else
              params.success [{operation: "cfn"}, {operation: "fld", model: "mock", id: 1, field: "field1", data: 0}, {operation: "syc"}] # no op from backend
              call = 2
          sleep()
        else
          sleep = =>
            if call is 1
              setTimeout sleep, 1
            else 
              params.success [{operation: "cfn"}, {operation: "fld", model: "mock", id: 1, field: "field1", data: 4}, {operation: "syc"}]
              @callback(obj)
          sleep()
      # set will trigger a sync
      obj.set
        field1: 1
      call = 1
      obj.set
        field1: 3
      # unlock ajax
      locked = false
      undefined
    "the final object value must equal 4" : (obj, fields)->
      assert.equal obj.fields.field1, 4
    "the backlog should contain the confirmation" : (obj, fields)->
      assert.equal obj.device.sync_log.backlog.length , 1

suite.export(module)