'use strict';

var defaultOptions = {
  debug: false
}

var Zabbix = function(url, user, password, options) {
  this.url = url;
  this.user = user;
  this.password = password;
  this.rpcid = 0;
  this.authid = null;
  this.options = typeof options === 'undefined' ? defaultOptions : options;
};

Zabbix.prototype.login = function(callback) {
  callback = callback || function() {
    return true;
  };

  var self = this;

  this.send('user.login', {
    'user': this.user,
    'password': this.password
  }, function(err, data) {
    if (!err) {
      self.authid = data.result;

      callback(null, data);
    } else {
      callback(err, data);
    }
  });
};

Zabbix.prototype.logout = function(callback) {
  callback = callback || function() {
    return true;
  };

  var self = this;

  this.send('user.logout', {}, function(err, data) {
    if (!err) {
      self.authid = null;

      callback(null, data);
    } else {
      callback(err, data);
    }
  });
};

Zabbix.prototype.send = function(method, params, callback) {
  callback = callback || function() {
    return true;
  };

  var self = this;

  if (this.options.debug) {
    console.log('::zabbix-api method: ' + method + ' params: ' + JSON.stringify(params)); // eslint-disable-line no-console
  }

  $.ajax({
    type: 'POST',
    url: this.url,
    headers: {
      'content-type': 'application/json-rpc'
    },
    dataType: 'json',
    data: JSON.stringify({
      jsonrpc: '2.0',
      id: ++this.rpcid,
      auth: this.authid,
      method: method,
      params: params
    }),
    error: function(jqXHRn, textStatus, errorThrown) {
      return callback(new Error(errorThrown));
    },
    success: function(data, textStatus, jqXHR) {
      if ((jqXHR.status === 200) && data) {
        if (self.options.debug) {
          console.log('::zabbix-api method: ' + method + ' result: ' + JSON.stringify(data)); // eslint-disable-line no-console
        }

        if (data.error) {
          return callback(new Error(data.error.data), data);
        }

        return callback(null, data);
      } else if (jqXHR.status === 412) {
        return callback(new Error('Invalid parameters'), data);
      } else {
        return callback(new Error('Unknown method'), data);
      }
    }
  });
};

module.exports = Zabbix;
