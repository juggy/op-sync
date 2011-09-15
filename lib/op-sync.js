var OS, _, _config, _implements, _log, _logs, _ref, _server, _transforms;
var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
  for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
  function ctor() { this.constructor = child; }
  ctor.prototype = parent.prototype;
  child.prototype = new ctor;
  child.__super__ = parent.prototype;
  return child;
}, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
_ref = typeof exports !== 'undefined' ? (_ = require("underscore"), [true, exports]) : [false, this.OS = {}], _server = _ref[0], OS = _ref[1];
_implements = function(object, interface) {
  var prop, _i, _len, _results;
  _results = [];
  for (_i = 0, _len = interface.length; _i < _len; _i++) {
    prop = interface[_i];
    _results.push((function() {
      if (typeof interface[prop] === "function" && typeof object[prop] !== "function") {
        throw new ("Object does not implement function " + prop + " as specified by the pseudo interface.");
      }
    })());
  }
  return _results;
};
OS.Transform = (function() {
  function Transform(opts) {
    if (opts == null) {
      opts = {};
    }
    this.model = opts.model, this.operation = opts.operation, this.data = opts.data, this.id = opts.id, this.remote = opts.remote;
    this.timestamp = opts.timestamp || new Date().getTime();
  }
  Transform.prototype.toJSON = function() {
    var json, name, prop;
    json = {};
    for (name in this) {
      prop = this[name];
      if (typeof prop !== "function" && name !== 'remote') {
        json[name] = prop;
      }
    }
    return json;
  };
  return Transform;
})();
OS.DeleteTransform = (function() {
  __extends(DeleteTransform, OS.Transform);
  function DeleteTransform(opts) {
    if (opts == null) {
      opts = {};
    }
    opts.operation = "del";
    DeleteTransform.__super__.constructor.call(this, opts);
  }
  return DeleteTransform;
})();
OS.SyncTransform = (function() {
  __extends(SyncTransform, OS.Transform);
  function SyncTransform(opts) {
    if (opts == null) {
      opts = {};
    }
    opts.operation = "syc";
    SyncTransform.__super__.constructor.call(this, opts);
  }
  return SyncTransform;
})();
OS.ConfirmationTransform = (function() {
  __extends(ConfirmationTransform, OS.Transform);
  function ConfirmationTransform(opts) {
    if (opts == null) {
      opts = {};
    }
    opts.operation = "cfn";
    ConfirmationTransform.__super__.constructor.call(this, opts);
  }
  return ConfirmationTransform;
})();
OS.AddTransform = (function() {
  __extends(AddTransform, OS.Transform);
  function AddTransform(opts) {
    if (opts == null) {
      opts = {};
    }
    opts.operation = "add";
    AddTransform.__super__.constructor.call(this, opts);
  }
  return AddTransform;
})();
OS.FieldTransform = (function() {
  __extends(FieldTransform, OS.Transform);
  function FieldTransform(opts) {
    if (opts == null) {
      opts = {};
    }
    opts.operation = 'fld';
    this.field = opts.field;
    FieldTransform.__super__.constructor.call(this, opts);
  }
  return FieldTransform;
})();
_transforms = {
  fld: OS.FieldTransform,
  add: OS.AddTransform,
  syc: OS.SyncTransform,
  cfn: OS.ConfirmationTransform,
  del: OS.DeleteTransform
};
OS.Interfaces = {};
OS.Interfaces.Persistence = (function() {
  function Persistence(store) {
    this.store = store != null ? store : {};
  }
  Persistence.prototype.get = function(key) {
    return this.store[key];
  };
  Persistence.prototype.set = function(key, value) {
    return this.store[key] = value;
  };
  Persistence.prototype.remove = function(key) {
    return delete this.store[key];
  };
  return Persistence;
})();
OS.Interfaces.Events = (function() {
  function Events() {}
  Events.prototype.update = function(model, id, values) {};
  Events.prototype.destroy = function(model, id) {};
  return Events;
})();
_config = {
  url: "/sync/",
  ajax: function(opts) {
    return $.ajax(opts);
  },
  events: new OS.Interfaces.Events,
  persistence: new OS.Interfaces.Persistence
};
_logs = [];
_log = function() {
  if (console) {
    return console.log.apply(this, arguments);
  } else {
    return _logs.concat(arguments);
  }
};
OS.Device = (function() {
  function Device(config, uuid) {
    var backlog;
    if (config == null) {
      config = {};
    }
    this.uuid = uuid != null ? uuid : null;
    config = _.extend(_.clone(_config), config);
    this.debug = config.debug;
    this.ajax = config.ajax;
    this.events = config.events;
    _implements(this.events, OS.Interfaces.Persistence);
    this.store = config.persistence;
    _implements(this.store, OS.Interfaces.Persistence);
    this.uuid = this.uuid || this.store.get("op.device.uuid");
    if (this.uuid) {
      backlog = this.store.get(uuid);
      this.sync_log = new OS.SyncLog(this, backlog);
    } else {
      this.uuid = this.gen_uuid();
      this.sync_log = new OS.SyncLog(this, []);
      this.register();
    }
  }
  Device.prototype.register = function() {
    var params;
    params = {
      success: __bind(function() {
        return this.save();
      }, this),
      error: function() {
        throw "Cannot register device with server.";
      },
      type: 'POST',
      dataType: 'json',
      contentType: 'application/json',
      processData: true,
      url: _config.url + "register",
      data: JSON.stringify({
        registration: this.uuid
      })
    };
    return this.ajax(params, this);
  };
  Device.prototype.save = function() {
    this.store.set("op.device.uuid", this.uuid);
    return this.store.set(this.uuid, this.sync_log.get_backlog());
  };
  Device.prototype.instance = function(model, id) {
    return new OS.InstanceLog(this.sync_log, model, id);
  };
  Device.prototype.gen_uuid = function() {
    var S4;
    S4 = function() {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4();
  };
  return Device;
})();
OS.SyncLog = (function() {
  SyncLog.prototype._instance_index = {};
  function SyncLog(device, backlog, options) {
    this.device = device;
    this.backlog = backlog != null ? backlog : [];
    this.options = options != null ? options : {};
  }
  SyncLog.prototype.instance_index = function(val) {
    var backlog, bl, index, key, tr, _i, _len;
    if (this._instance_index && !val) {
      return this.instance_index;
    }
    backlog = val || this.get_backlog();
    index = val ? {} : this._instance_index = {};
    for (_i = 0, _len = backlog.length; _i < _len; _i++) {
      tr = backlog[_i];
      if (tr.model && tr.id) {
        key = "" + tr.model + "-" + tr.id;
        bl = index[key] || (index[key] = []);
        bl.push(tr);
      }
    }
    return index;
  };
  SyncLog.prototype.guard = function() {
    this.guarded = true;
    this.sort_backlog();
    return this.guarded_backlog = [];
  };
  SyncLog.prototype.unguard = function() {
    this.guarded = false;
    this.add_to_backlog(this.guarded_backlog);
    if (this.guarded_backlog.length > 0) {
      return this.sync_backlog();
    }
  };
  SyncLog.prototype.sync_backlog = function() {
    var error, params, success, tr, _ref2;
    if (this.guarded) {
      return;
    }
    success = __bind(function(incoming) {
      this._add_to_backlog(this.parse_incoming(incoming));
      this.post_sync_process();
      return this.unguard();
    }, this);
    error = __bind(function(resp) {
      return this.unguard();
    }, this);
    this.guard();
    this._reset_synced();
    if (((_ref2 = _.last(this.backlog)) != null ? _ref2.operation : void 0) !== "syc") {
      this.backlog.push(new OS.SyncTransform());
    }
    if (this.device.debug) {
      _log("Sync Backlog", this.backlog);
    }
    params = {
      success: success,
      error: error,
      type: 'POST',
      dataType: 'json',
      contentType: 'application/json',
      processData: true,
      url: _config.url + this.device.uuid,
      data: JSON.stringify((function() {
        var _i, _len, _ref3, _results;
        _ref3 = this.get_backlog();
        _results = [];
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          tr = _ref3[_i];
          _results.push(tr.toJSON());
        }
        return _results;
      }).call(this))
    };
    return this.device.ajax(params);
  };
  SyncLog.prototype.parse_incoming = function(data) {
    var itr, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = data.length; _i < _len; _i++) {
      itr = data[_i];
      _results.push(new _transforms[itr.operation](_.extend(itr, {
        remote: true
      })));
    }
    return _results;
  };
  SyncLog.prototype._reset_synced = function() {
    var backlog_local, index, last, spliced, tr, _i, _len, _results;
    backlog_local = _.clone(this.backlog);
    index = 0;
    spliced = 0;
    last = "";
    _results = [];
    for (_i = 0, _len = backlog_local.length; _i < _len; _i++) {
      tr = backlog_local[_i];
      index++;
      _results.push(tr.operation === "cfn" && last === "syc" ? (this.backlog = this.backlog.splice(index - spliced - 1), spliced = index - 1, this.reset_index()) : last = tr.operation);
    }
    return _results;
  };
  SyncLog.prototype.post_sync_process = function(incoming) {
    var compiled, deleted, fields, inst_bl, instance, instance_key, last, tr, _i, _len, _ref2;
    if (this.device.debug) {
      _log("Post Sync: ", this.backlog);
    }
    this._reset_synced();
    if (this.device.debug) {
      _log("Post Sync after reset: ", this.backlog);
    }
    _ref2 = this.instance_index(this.backlog);
    for (instance_key in _ref2) {
      inst_bl = _ref2[instance_key];
      deleted = false;
      fields = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = inst_bl.length; _i < _len; _i++) {
          tr = inst_bl[_i];
          _results.push((function() {
            switch (tr.operation) {
              case "del":
                this.device.events.destroy(tr.model, tr.id);
                deleted = true;
                break;
              default:
                return tr;
            }
          }).call(this));
        }
        return _results;
      }).call(this);
      if (deleted) {
        break;
      }
      if (fields.length > 0) {
        instance = this.device.instance(fields[0].model, fields[0].id);
        compiled = instance.compile(fields);
        if (this.device.debug) {
          _log("Update object (" + instance.model + ", " + instance.id + "):", compiled);
        }
        if (!_.isEmpty(compiled)) {
          this.device.events.update(instance.model, instance.id, compiled);
        }
        for (_i = 0, _len = fields.length; _i < _len; _i++) {
          tr = fields[_i];
          tr.remote = false;
        }
      }
    }
    last = _.last(this.backlog);
    if ((last != null ? last.operation : void 0) === "syc") {
      this.backlog.push(new OS.ConfirmationTransform({
        timestamp: last.timestamp
      }));
    }
    this._reset_synced();
    if (this.device.debug) {
      return _log("Post Sync after reset 2: ", this.backlog);
    }
  };
  SyncLog.prototype.get_backlog = function() {
    if (this.guarded) {
      this.guarded_backlog;
    } else if (!this.sorted) {
      this.sort_backlog();
    }
    return this.backlog;
  };
  SyncLog.prototype.sort_backlog = function() {
    this.sorted = true;
    return this.backlog = _.sortBy(this.backlog, function(i) {
      return i.timestamp;
    });
  };
  SyncLog.prototype.reset_index = function() {
    this.sorted = false;
    this._instance_index = null;
    return this.sort_backlog();
  };
  SyncLog.prototype.add_to_backlog = function(backlog) {
    if (this.guarded) {
      return this.guarded_backlog = this.guarded_backlog.concat(backlog);
    } else {
      return this._add_to_backlog(backlog);
    }
  };
  SyncLog.prototype._add_to_backlog = function(backlog) {
    this.backlog = this.backlog.concat(backlog);
    this.reset_index();
    return this.device.save();
  };
  SyncLog.prototype.get_instance_backlog = function(instance_sync) {
    return this.instance_index()["" + instance_sync.model + "-" + instance_sync.id] || [];
  };
  SyncLog.prototype.remove_instance_backlog = function(instance_sync) {
    var backlog, final, index, spliced, tr, _i, _len;
    backlog = this.get_backlog();
    final = _.clone(backlog);
    spliced = 0;
    index = 0;
    for (_i = 0, _len = backlog.length; _i < _len; _i++) {
      tr = backlog[_i];
      if (tr.model === instance_sync.model && tr.id === instance_sync.id) {
        final = final.splice(index - spliced++, 1);
      }
      index++;
    }
    this.backlog = final;
    this.reset_index();
    return this.device.save();
  };
  SyncLog.prototype.set_instance_backlog = function(instance_sync, backlog) {
    this.remove_instance_backlog(instance_sync);
    return this.add_to_backlog(backlog);
  };
  return SyncLog;
})();
OS.InstanceLog = (function() {
  function InstanceLog(sync_log, model, id) {
    this.sync_log = sync_log;
    this.model = model;
    this.id = id;
    this.sync_fields = __bind(this.sync_fields, this);
    this.backlog = this.sync_log.get_instance_backlog(this);
  }
  InstanceLog.prototype.sync_fields = function(values, sync) {
    var field, field_value, op;
    if (values == null) {
      values = {};
    }
    if (sync == null) {
      sync = true;
    }
    op = (function() {
      var _results;
      _results = [];
      for (field in values) {
        field_value = values[field];
        _results.push(new OS.FieldTransform({
          field: field,
          data: field_value,
          model: this.model,
          id: this.id
        }));
      }
      return _results;
    }).call(this);
    this.compress(op);
    if (sync) {
      return this.sync_log.sync_backlog();
    }
  };
  InstanceLog.prototype.destroy = function() {};
  InstanceLog.prototype.set_backlog = function(backlog) {
    this.backlog = _.clone(backlog);
    return this.sync_log.set_instance_backlog(this, this.backlog);
  };
  InstanceLog.prototype.compile = function(incoming) {
    var data, tr, _i, _len;
    data = {};
    for (_i = 0, _len = incoming.length; _i < _len; _i++) {
      tr = incoming[_i];
      if (tr.remote) {
        data[tr.field] = tr.data;
      }
    }
    return data;
  };
  InstanceLog.prototype.compress = function(incoming, backlog) {
    var field, fields, latest_fields, tr, transforms, _i, _len;
    if (backlog == null) {
      backlog = null;
    }
    backlog = backlog || this.backlog;
    transforms = incoming.concat(backlog);
    latest_fields = {};
    for (_i = 0, _len = transforms.length; _i < _len; _i++) {
      tr = transforms[_i];
      field = latest_fields[tr.field];
      latest_fields[tr.field] = !field ? tr : tr.timestamp > field.timestamp ? tr : field;
    }
    transforms = (function() {
      var _results;
      _results = [];
      for (fields in latest_fields) {
        tr = latest_fields[fields];
        _results.push(tr);
      }
      return _results;
    })();
    this.set_backlog(transforms);
    return transforms;
  };
  return InstanceLog;
})();