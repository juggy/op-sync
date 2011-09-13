(function() {
  var existing_device;
  existing_device = exports.existing_device = function(ajax) {
    var store;
    if (ajax == null) {
      ajax = function() {};
    }
    store = new op.Interfaces.Persistence;
    store.set("op.device.uuid", 1);
    store.set(1, []);
    return new op.Device({
      persistence: store,
      ajax: ajax
    });
  };
  exports.MockModel = (function() {
    function _Class(opts, device) {
      if (opts == null) {
        opts = {
          model: "mock",
          id: 1
        };
      }
      this.device = device != null ? device : existing_device();
      this.model = opts.model, this.id = opts.id;
      this.instance = this.device.instance(this.model, this.id);
    }
    _Class.prototype.set = function(fields) {
      return this.instance.sync_fields(fields);
    };
    return _Class;
  })();
}).call(this);
