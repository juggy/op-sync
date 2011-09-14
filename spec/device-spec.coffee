vows = require( "vows" )
assert = require( 'assert' )
op = require( "../src/op-sync")
h = require('./helpers')

suite = vows.describe("device")
suite.addBatch
  "create a totally new device" :
    topic: -> 
      new op.Device
        ajax: (params, dev)=>
          params.success()
          @callback( dev, params )
      undefined
    "params should contain the registration information" : (device, params) ->
      assert.equal device.uuid, JSON.parse( params.data ).registration
    "store should contain a reference to the device" : (device, params) ->
      assert.isDefined device.store.get(device.uuid)
      assert.equal device.uuid, device.store.get("op.device.uuid")
    "store should contain a an empty backlog": (device, params) ->
      assert.equal device.store.get(device.uuid).length, 0

  "reuse an existing device" : 
    topic: ->
      store = new op.Interfaces.Persistence
      store.set "op.device.uuid", 1
      store.set 1, []
      new op.Device
        persistence: store
    "device should use previous device" : (dev)->
      assert.equal dev.uuid, 1
suite.export(module)