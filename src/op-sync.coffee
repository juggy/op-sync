# Export for both CommonJS and the browser.
[_server, OS] = if typeof exports isnt 'undefined'
  _ = require "underscore"
  [true, exports]
else 
  [false, this.OS = {}]

# Check for the implementation of a function by an object and throw if not
# This is to enforce some kind a interface at runtime
_implements = (object, interface)->
  for prop in interface
    if typeof interface[prop] is "function" and typeof object[prop] isnt "function"
      throw new "Object does not implement function #{prop} as specified by the pseudo interface."

# Base transform object ot be assembled to create operations on fields
# All transform for a particular model/id uses the same guid to group them
class OS.Transform
  constructor: (opts)->
    {@model, @operation, @data, @id} = opts
    @timestamp = new Date()
  toJSON: ->
    json = {}
    for name, prop of this
      json[name] = prop if typeof prop isnt "function"

class OS.DeleteTransform extends OS.Transform
  constructor: (opts)->
    opts.operation = "del"
    super opts

class OS.SyncTransform extends OS.Transform
  constructor: (opts)->
    opts.operation = "syc"
    super opts

class OS.AddTransform extends OS.Transform
  constructor: (opts)->
    opts.operation = "add"
    super opts

class OS.FieldTransform extends OS.Transform
  constructor: (opts) ->
    opts.operation = 'fld'
    {@field} = opts
    super opts    

# map to the different transforms types
_transforms = 
  fld: OS.FieldTransform
  add: OS.AddTransform
  syc: OS.SyncTransform
  del: OS.DeleteTransform


# This interface must be implemented and given to the config for
# op-sync to work offline.
OS.Interfaces = {}
class OS.Interfaces.Persistence
  constructor: (@store = {})->
  get: (key)->@store[key]
  set: (key, value)-> @store[key] = value
  remove: (key)-> delete @store[key]

class OS.Interfaces.Events
  update: (model, id, values)->
  destroy: (model, id)->

_config =
  url : "/sync/"
  ajax: (opts)-> $.ajax(opts)
  events: new OS.Interfaces.Events
  persistence: new OS.Interfaces.Persistence

class OS.Device
  constructor: (config = {}, @uuid = null)->

    config = _.extend _.clone(_config), config

    # Communication layer - same as jquery ajax
    @ajax = config.ajax

    # callbacks when updating local object
    @events = config.events
    _implements(@events, OS.Interfaces.Persistence)

    # lookup the local storage or use in memory
    @store = config.persistence
    _implements(@store, OS.Interfaces.Persistence)

    @uuid = @uuid || @store.get "op.device.uuid"
    if @uuid
      # load uuid from persistence
      backlog = @store.get uuid
      @sync_log = new OS.SyncLog(this, backlog)
    else
      # gen uuid and trigger device reg
      @uuid = @gen_uuid()
      @sync_log = new OS.SyncLog(this, [])
      @register()
      

  register: ->
    params = 
      success: => @save()
      error: -> throw "Cannot register device with server."
      type :     'POST'
      dataType : 'json'
      contentType : 'application/json'
      processData : true
      url: _config.url + "register"
      data : JSON.stringify( {registration : @uuid} )

    @ajax( params, this)

  save: ->
    @store.set "op.device.uuid", @uuid
    @store.set @uuid, @sync_log.backlog

  instance: (model, id)->
    new OS.InstanceLog(@sync_log, model, id)

  gen_uuid: ->
    S4 = -> (((1+Math.random())*0x10000)|0).toString(16).substring(1)
    (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4())
  
# Sync log
class OS.SyncLog
  instance_index: {}
  constructor: (@device, @backlog = [], @options = {})->

  instance_index: ->
    return @_instance_index if @_instance_index
    # recreate index
    @_instance_index = {}
    for tr in @get_backlog()
      key = "#{tr.model}-#{tr.id}"
      index = @_instance_index[key] || (@_instance_index[key] = [])
      index.push tr
    @_instance_index

  sync_backlog:()->
    success = (incoming)=>
      # merge the incoming resp
      @add_to_backlog @parse_backlog(incoming)
      @post_sync_process()
        
    # error callback
    # when something goes wrong either on the server
    # or in the connection, keep the backlog.
    error = (resp)=>
      # keep the backlog, not much to do
      
    @backlog.push new OS.SyncTransform
    # Default JSON options.
    params = 
      success: success
      error: error
      type :     'POST'
      dataType : 'json'
      contentType : 'application/json'
      processData : true
      url: _config.url + @device.uuid
      data : JSON.stringify( tr.toJSON() for tr in @get_backlog() )

    @device.ajax( params )

  parse_incoming: (data)->
    for tr in data
      new _transforms[tr.operation](tr)

  post_sync_process: ->
    # TODO handle delete, add and synced transforms

    # if there is a sync in the incoming and the same sync in the backlog
    # then reset the backlog up to the sync and start transforms from there
    
    # if there is a delete anywhere in the incoming or backlog
    # it takes precedence on anything and results on deletion

    # there is nothing specific to the add. The id is simply not known

    # go thru the whole backlog to find consecutive syncs
    backlog_local = _.clone @get_backlog()
    index = 0
    spliced = 0
    for tr in backlog_local
      if tr.operation is "syc" and backlog_local[++index]?.operation is "syc"
        #trash whatever came before
        @backlog = @backlog.splice(index - spliced)
        spliced = index
        @_instance_index = null

    #go thru the backlog and compress each instances
    for inst_bl,instance in @instance_index()
      instance = new OS.InstanceLog(tr.model, tr.id)
      deleted = false
      fields = for tr in inst_bl
        switch tr.operation
          when "del" #look for delete
            # delete will remove all backlog items
            instance.delete_instance()
            deleted = true
            break # we can bail out now
          else
            tr
      break if deleted
      # this will set the backlog(!?) and update the record locally
      @device.events.update instance.model, instance.id, instance.compile(fields) 
    #complete our successful sync by marking the backlog
    @add_to_backlog [new OS.SyncTransform]

  get_backlog: ->
   @backlog
  
  add_to_backlog: (backlog)->
    @backlog = @backlog.concat backlog
    # TODO sort _backlog
    @instance_index = null
    @device.save()
  
  get_instance_backlog:(instance_sync)->
    @instance_index()["#{instance_sync.model}-#{instance_sync.id}"] || []

  remove_instance_backlog: (instance_sync)->
    backlog = @get_backlog()
    final = _.clone backlog
    spliced = 0
    index = 0
    for tr in backlog
      if tr.model is instance_sync.model and tr.id is instance_sync.id
        final = final.splice(index - spliced++, 1)
      index++
    @backlog = final
    @instance_index = null
    @device.save()

  set_instance_backlog:(instance_sync, backlog)->
    @remove_instance_backlog(instance_sync)
    @add_to_backlog(backlog)

class OS.InstanceLog
  constructor: (@sync_log, @model, @id)->
    # TODO load the backlog from persistence
    @backlog = @sync_log.get_instance_backlog(this)

  sync_fields: (values = {})=>
    # create all transforms
    op = for field, field_value of values
      new OS.FieldTransform
        field: field
        data: field_value
        model: @model
        id: @id
    # compress them with previous ones
    # update data locally
    @compress op

  destroy:->
    # something

  set_backlog: (backlog)->
    # set the backlog for this instance into the Global backlog
    @backlog = _.clone backlog
    @sync_log.set_instance_backlog(this, @backlog)

  compile: (incoming = null, backlog = null)->
    backlog = backlog || @backlog
    # compress incoming with backlog to have only last transform for a field
    backlog = @compress( incoming, backlog ) if incoming
    data = {}
    for tr in backlog
      data[tr.field] =  tr.data
    data

  compress: (incoming, backlog = null)->
    backlog = backlog || @backlog
    # merge backlog and incoming
    transforms = incoming.concat backlog
    # break into fields
    latest_fields = {}
    for tr in transforms
      field = latest_fields[tr.field]
      latest_fields[tr.field] = if not field
        # new one so it is the latest transform
        tr 
      else
        # pick the latest only
        if tr.timestamp > field.timestamp then tr else field
    # get only transform
    transforms = (tr for fields, tr of latest_fields)
    @set_backlog(transforms)

    transforms
    
