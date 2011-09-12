(function() {
  var OS, _config, _implements, _ref, _server, _transforms;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
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
  _ref = typeof exports !== 'undefined' ? [true, exports] : [false, this.OS = {}], _server = _ref[0], OS = _ref[1];
  OS.Transform = (function() {
    function Transform(opts) {
      this.model = opts.model, this.operation = opts.operation, this.data = opts.data, this.id = opts.id;
      this.timestamp = new Date();
    }
    Transform.prototype.toJSON = function() {
      var json, name, prop, _results;
      json = {};
      _results = [];
      for (name in this) {
        prop = this[name];
        _results.push(typeof prop !== "function" ? json[name] = prop : void 0);
      }
      return _results;
    };
    return Transform;
  })();
  OS.DeleteTransform = (function() {
    __extends(DeleteTransform, OS.Transform);
    function DeleteTransform(opts) {
      opts.operation = "del";
      DeleteTransform.__super__.constructor.call(this, opts);
    }
    return DeleteTransform;
  })();
  OS.SyncTransform = (function() {
    __extends(SyncTransform, OS.Transform);
    function SyncTransform(opts) {
      opts.operation = "syc";
      SyncTransform.__super__.constructor.call(this, opts);
    }
    return SyncTransform;
  })();
  OS.AddTransform = (function() {
    __extends(AddTransform, OS.Transform);
    function AddTransform(opts) {
      opts.operation = "add";
      AddTransform.__super__.constructor.call(this, opts);
    }
    return AddTransform;
  })();
  OS.FieldTransform = (function() {
    __extends(FieldTransform, OS.Transform);
    function FieldTransform(opts) {
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
    store: new OS.Interfaces.Persistence
  };
  OS.configure = function(block) {
    block.call(_config);
    OS.ajax = _config.ajax;
    OS.events = _config.events;
    _implements(_callbacks, OS.Interfaces.Persistence);
    OS.store = _config.persistence;
    return _implements(OS.store, OS.Interfaces.Persistence);
  };
  OS.Device = (function() {
    function Device(uuid) {
      var backlog;
      this.uuid = uuid != null ? uuid : null;
      this.uuid = this.uuid || OS.store.get("op.device.uuid");
      this.sync_log = this.uuid ? (backlog = OS.store.get(uuid), new OS.SyncLog(this, backlog)) : (this.uuid = this.gen_uuid(), this.register(), new OS.SyncLog(this, backlog));
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
      return OS.ajax(params);
    };
    Device.prototype._save = function() {
      OS.store.set("op.device.uuid", this.uuid);
      return OS.store.set(this.uuid, this.sync_log.backlog);
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
    SyncLog.prototype.instance_index = {};
    function SyncLog(device, backlog, options) {
      this.device = device != null ? device : new OS.Device;
      this.backlog = backlog != null ? backlog : [];
      this.options = options != null ? options : {};
    }
    SyncLog.prototype.instance_index = function() {
      var index, key, tr, _i, _len, _ref2;
      if (this._instance_index) {
        return this._instance_index;
      }
      this._instance_index = {};
      _ref2 = this.get_backlog();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        tr = _ref2[_i];
        key = "" + tr.model + "-" + tr.id;
        index = this._instance_index[key] || (this._instance_index[key] = []);
        index.push(tr);
      }
      return this._instance_index;
    };
    SyncLog.prototype.sync_backlog = function() {
      var error, params, success, tr;
      success = __bind(function(incoming) {
        this.add_to_backlog(this.parse_backlog(incoming));
        return this.post_sync_process();
      }, this);
      error = __bind(function(resp) {}, this);
      this.backlog.push(new OS.SyncTransform);
      params = {
        success: success,
        error: error,
        type: 'POST',
        dataType: 'json',
        contentType: 'application/json',
        processData: true,
        url: _config.url + this.device.uuid,
        data: JSON.stringify((function() {
          var _i, _len, _ref2, _results;
          _ref2 = this.get_backlog();
          _results = [];
          for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
            tr = _ref2[_i];
            _results.push(tr.toJSON());
          }
          return _results;
        }).call(this))
      };
      return OS.ajax(params);
    };
    SyncLog.prototype.parse_incoming = function(data) {
      var tr, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = data.length; _i < _len; _i++) {
        tr = data[_i];
        _results.push(new _transforms[tr.operation](tr));
      }
      return _results;
    };
    SyncLog.prototype.post_sync_process = function() {
      var backlog_local, deleted, fields, index, inst_bl, instance, spliced, tr, _i, _len, _len2, _ref2, _ref3;
      backlog_local = this.get_backlog().splice(0);
      index = 0;
      spliced = 0;
      for (_i = 0, _len = backlog_local.length; _i < _len; _i++) {
        tr = backlog_local[_i];
        if (tr.operation === "syc" && ((_ref2 = backlog_local[++index]) != null ? _ref2.operation : void 0) === "syc") {
          this.backlog = this.backlog.splice(index - spliced);
          spliced = index;
          this._instance_index = null;
        }
      }
      _ref3 = this.instance_index();
      for (instance = 0, _len2 = _ref3.length; instance < _len2; instance++) {
        inst_bl = _ref3[instance];
        instance = new OS.InstanceLog(tr.model, tr.id);
        deleted = false;
        fields = (function() {
          var _j, _len3, _results;
          _results = [];
          for (_j = 0, _len3 = inst_bl.length; _j < _len3; _j++) {
            tr = inst_bl[_j];
            _results.push((function() {
              switch (tr.operation) {
                case "del":
                  instance.delete_instance();
                  deleted = true;
                  break;
                default:
                  return tr;
              }
            })());
          }
          return _results;
        })();
        if (deleted) {
          break;
        }
        OS.events.update(instance.model, instance.id, instance.compile(fields));
      }
      return this.add_to_backlog([new OS.SyncTransform]);
    };
    SyncLog.prototype.get_backlog = function() {
      return this.backlog;
    };
    SyncLog.prototype.add_to_backlog = function(backlog) {
      this.backlog = this.backlog.concat(backlog);
      this.instance_index = null;
      return this.device.save();
    };
    SyncLog.prototype.get_instance_backlog = function(instance_sync) {
      return this.instance_index()["" + instance_sync.model + "-" + instance_sync.id] || [];
    };
    SyncLog.prototype.remove_instance_backlog = function(instance_sync) {
      var backlog, final, index, sliced, tr, _i, _len;
      backlog = this.get_backlog();
      final = backlog.splice(0);
      sliced = 0;
      index = 0;
      for (_i = 0, _len = backlog.length; _i < _len; _i++) {
        tr = backlog[_i];
        if (tr.model === instance_sync.model && tr.id === instance_sync.id) {
          final = final.splice(index - spliced++, 1);
        }
        index++;
      }
      this.backlog = final;
      this.instance_index = null;
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
    InstanceLog.prototype.sync_fields = function(values) {
      var field, field_value, op;
      if (values == null) {
        values = {};
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
      return this.compress(op);
    };
    InstanceLog.prototype.destroy = function() {};
    InstanceLog.prototype.set_backlog = function(backlog) {
      this.backlog = backlog.splice(0);
      return this.sync_log.set_instance_backlog(this, this.backlog);
    };
    InstanceLog.prototype.compile = function(incoming, backlog) {
      var data, tr, _i, _len;
      if (incoming == null) {
        incoming = null;
      }
      if (backlog == null) {
        backlog = null;
      }
      backlog = backlog || this.backlog;
      if (incoming) {
        backlog = this.compress(incoming, backlog);
      }
      data = {};
      for (_i = 0, _len = backlog.length; _i < _len; _i++) {
        tr = backlog[_i];
        data[tr.field] = tr.data;
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
}).call(this);
