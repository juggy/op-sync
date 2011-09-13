op = require( "../src/op-sync")

existing_device = exports.existing_device = (ajax = ()-> )->
  store = new op.Interfaces.Persistence
  store.set "op.device.uuid", 1
  store.set 1, []
  new op.Device
    persistence: store
    ajax: ajax

exports.MockModel = class 
  constructor: (opts = {model: "mock", id: 1}, @device = existing_device())->
    {@model, @id} = opts
    @instance = @device.instance(@model, @id)
  set: (fields)->
    @instance.sync_fields(fields)