'use strict';

var request = require('browser-request');

var Client = function(url, user, password) {
    this.url = url;
    this.user = user;
    this.password = password;
    this.rpcid = 0;
    this.authid = null;
    this.debug = true;
};

Client.prototype.call = function call(method, params, callback) {
    callback = callback || function() {
        return true;
    };

    var self = this;

    if (this.debug) {
        console.log('::zabbix-api method: ' + method + ' params: ' + JSON.stringify(params));
    }

    request({
        method: 'POST',
        uri: this.url,
        headers: {
            'content-type': 'application/json-rpc'
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: ++this.rpcid,
            auth: this.authid,
            method: method,
            params: params
        }),
        rejectUnauthorized: false
    }, function(err, res, body) {
        var data = null;

        if (err) {
            callback(err, data);
        } else {
            if ((res.statusCode === 200) && (typeof body !== 'undefined')) {
                data = JSON.parse(body);

                if (self.debug) {
                    console.log('::zabbix-api method: ' + method + ' result: ' + body);
                }

                callback(null, data);
            } else if (res.statusCode === 412) {
                callback(new Error('Invalid parameters'), data);
            } else {
                callback(new Error('Unknown method'), data);
            }
        }
    });
};

Client.prototype.authenticate = function authenticate(callback) {
    callback = callback || function() {
        return true;
    };

    var self = this;

    this.call('user.authenticate', {
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