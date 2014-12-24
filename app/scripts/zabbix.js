'use strict';

var Client = function(url, user, password, debug) {
    this.url = url;
    this.user = user;
    this.password = password;
    this.rpcid = 0;
    this.authid = null;
    this.debug = (typeof debug === 'undefined' ? false : debug);
};

Client.prototype.send = function send(method, params, callback) {
    callback = callback || function() {
        return true;
    };

    var self = this;

    if (this.debug) {
        console.log('::zabbix-api method: ' + method + ' params: ' + JSON.stringify(params));
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
                if (self.debug) {
                    console.log('::zabbix-api method: ' + method + ' result: ' + JSON.stringify(data));
                }

                return callback(null, data);
            } else if (jqXHR.status === 412) {
                return callback(new Error('Invalid parameters'));
            } else {
                return callback(new Error('Unknown method'));
            }
        }
    });
};

Client.prototype.authenticate = function authenticate(callback) {
    callback = callback || function() {
        return true;
    };

    var self = this;

    this.send('user.authenticate', {
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

module.exports = Client;
