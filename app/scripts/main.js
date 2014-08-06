'use strict';

var doT = require('dot');

var Zabbix = require('./zabbix');

var templates = require('./templates');

var config = require('./config');

var clients = {};
var servers = {};
var groups = {};
var hosts = {};
var triggers = {};

var view = 'home';

/*
 * Functions
 */

function connectClients(callback) {
    var clients = {};

    var count = config.servers.length;

    var doConnect = function(server) {
        count--;

        var client = new Zabbix(server.url, server.user, server.password);

        client.config = server;

        client.authenticate(function(err, data) {
            if (err) {
                callback(err, null);
            }

            clients[server.name] = client;

            if (!count) {
                callback(null, clients);
            }
        });
    };

    for (var i = 0, j = count; i < j; i++) {
        doConnect(config.servers[i]);
    }
}

function getServers(clients, callback) {
    var servers = [];

    var keys = Object.keys(clients);
    var count = keys.length;

    for (var i = 0, j = count; i < j; i++) {
        servers.push(keys[i]);
    }

    callback(null, servers);
}

function getHostGroups(clients, servers, callback) {
    var groups = {};

    var keys = Object.keys(clients);
    var count = keys.length;

    var doGetHostGroups = function(client) {
        count--;

        if (servers && (servers.indexOf(client.config.name) === -1)) {
            if (!count) {
                callback(null, groups);
            }
        } else {
            client.call('hostgroup.get', {
                output: 'extend',
            }, function(err, data) {
                if (err) {
                    callback(err, groups);
                }

                groups[client.config.name] = data.result;

                if (!count) {
                    callback(null, groups);
                }
            });
        }
    };

    for (var i = 0, j = count; i < j; i++) {
        doGetHostGroups(clients[keys[i]]);
    }
}

function getHosts(clients, servers, groups, callback) {
    var hosts = {};

    var keys = Object.keys(clients);
    var count = keys.length;

    var doGetHosts = function(client) {
        count--;

        if (servers && (servers.indexOf(client.config.name) === -1)) {
            if (!count) {
                callback(null, hosts);
            }
        } else {
            client.call('host.get', {
                output: 'extend',
            }, function(err, data) {
                if (err) {
                    callback(err, hosts);
                }

                hosts[client.config.name] = data.result;

                if (!count) {
                    callback(null, hosts);
                }
            });
        }
    };

    for (var i = 0, j = count; i < j; i++) {
        doGetHosts(clients[keys[i]]);
    }
}

function getTriggers(clients, servers, groups, callback) {
    var triggers = {};

    var keys = Object.keys(clients);
    var count = keys.length;

    var doGetTriggers = function(client) {
        count--;

        if (servers && (servers.indexOf(client.config.name) === -1)) {
            if (!count) {
                callback(null, triggers);
            }
        } else {
            var params = {
                output: 'extend',
                expandData: 1,
                expandDescription: 1,
                expandExpression: 1,
                monitored: 1,
                min_severity: config.triggers.selectMinimalSeverity,
                only_true: true
            };

            if (client.config.triggers.selectInMaintenance) {
                params.maintenance = 1;
            } else if (config.triggers.selectInMaintenance) {
                params.maintenance = 1;
            }

            if (client.config.triggers.selectWithUnacknowledgedEvents) {
                params.withUnacknowledgedEvents = 1;
            } else if (config.triggers.selectWithUnacknowledgedEvents) {
                params.withUnacknowledgedEvents = 1;
            }

            if (client.config.triggers.selectWithAcknowledgedEvents) {
                params.withAcknowledgedEvents = 1;
            } else if (config.triggers.selectWithAcknowledgedEvents) {
                params.withAcknowledgedEvents = 1;
            }

            if (client.config.triggers.selectWithLastEventUnacknowledged) {
                params.withLastEventUnacknowledged = 1;
            } else if (config.triggers.selectWithLastEventUnacknowledged) {
                params.withLastEventUnacknowledged = 1;
            }

            if (client.config.triggers.selectWithLastEventUnacknowledged) {
                params.withLastEventUnacknowledged = 1;
            } else if (config.triggers.selectWithLastEventUnacknowledged) {
                params.withLastEventUnacknowledged = 1;
            }

            if (client.config.triggers.selectSkipDependent) {
                params.skipDependent = 1;
            } else if (config.triggers.selectSkipDependent) {
                params.skipDependent = 1;
            }

            if (client.config.triggers.lastChangeSince) {
                params.lastChangeSince = client.config.triggers.lastChangeSince;
            } else if (config.triggers.lastChangeSince) {
                params.lastChangeSince = config.triggers.lastChangeSince;
            }

            if (client.config.triggers.limit) {
                params.limit = client.config.triggers.limit;
            } else if (config.triggers.limit) {
                params.limit = config.triggers.limit;
            }

            if (client.config.triggers.sortField) {
                params.sortfield = client.config.triggers.sortField;
            } else if (config.triggers.sortField) {
                params.sortfield = config.triggers.sortField;
            }

            if (client.config.triggers.sortOrder) {
                params.sortorder = client.config.triggers.sortOrder;
            } else if (config.triggers.sortField) {
                params.sortorder = config.triggers.sortOrder;
            }

            client.call('trigger.get', params, function(err, data) {
                if (err) {
                    callback(err, null);
                }

                triggers[client.config.name] = data.result;

                if (!count) {
                    callback(null, triggers);
                }
            });
        }
    };

    for (var i = 0, j = count; i < j; i++) {
        doGetTriggers(clients[keys[i]]);
    }
}

function showHome() {
    view = 'home';

    getTriggers(clients, null, null, function(err, data) {
        if (err) {
            console.error(err);

            return;
        }

        triggers = data;

        $('#view').html(templates.home({
            triggers: triggers
        }));
    });
}

function showHistory() {
    view = 'history';

    getTriggers(clients, null, null, function(err, data) {
        if (err) {
            console.error(err);

            return;
        }

        triggers = data;

        $('#view').html(templates.history({
            triggers: triggers
        }));
    });
}

function refresh() {
    switch (view) {
        case 'home':
            showHome();
            break;

        case 'history':
            showHistory();
            break;

        default:
            break;
    }

    if (config.refresh) {
        setTimeout(refresh, config.refresh * 1000);
    }
}

$('body').on('click', 'a[href="#home"]', function(e) {
    view = 'home';
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#history"]', function(e) {
    view = 'history';
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#refresh"]', function(e) {
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#refresh-0"]', function(e) {
    $('a[href="#refresh-' + config.refresh + '"]').parent().removeClass('active');
    $('a[href="#refresh-0"]').parent().addClass('active');

    config.refresh = 0;

    e.preventDefault();
});

$('body').on('click', 'a[href="#refresh-30"]', function(e) {
    $('a[href="#refresh-' + config.refresh + '"]').parent().removeClass('active');
    $('a[href="#refresh-30"]').parent().addClass('active');

    config.refresh = 30;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#refresh-60"]', function(e) {
    $('a[href="#refresh-' + config.refresh + '"]').parent().removeClass('active');
    $('a[href="#refresh-60"]').parent().addClass('active');

    config.refresh = 60;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#refresh-300"]', function(e) {
    $('a[href="#refresh-' + config.refresh + '"]').parent().removeClass('active');
    $('a[href="#refresh-300"]').parent().addClass('active');

    config.refresh = 300;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#refresh-900"]', function(e) {
    $('a[href="#refresh-' + config.refresh + '"]').parent().removeClass('active');
    $('a[href="#refresh-900"]').parent().addClass('active');

    config.refresh = 900;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#severity-0"]', function(e) {
    $('a[href="#severity-' + config.triggers.selectMinimalSeverity + '"]').parent().removeClass('active');
    $('a[href="#severity-0"]').parent().addClass('active');

    config.triggers.selectMinimalSeverity = 0;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#severity-1"]', function(e) {
    $('a[href="#severity-' + config.triggers.selectMinimalSeverity + '"]').parent().removeClass('active');
    $('a[href="#severity-1"]').parent().addClass('active');

    config.triggers.selectMinimalSeverity = 1;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#severity-2"]', function(e) {
    $('a[href="#severity-' + config.triggers.selectMinimalSeverity + '"]').parent().removeClass('active');
    $('a[href="#severity-2"]').parent().addClass('active');

    config.triggers.selectMinimalSeverity = 2;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#severity-3"]', function(e) {
    $('a[href="#severity-' + config.triggers.selectMinimalSeverity + '"]').parent().removeClass('active');
    $('a[href="#severity-3"]').parent().addClass('active');

    config.triggers.selectMinimalSeverity = 3;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#severity-4"]', function(e) {
    $('a[href="#severity-' + config.triggers.selectMinimalSeverity + '"]').parent().removeClass('active');
    $('a[href="#severity-4"]').parent().addClass('active');

    config.triggers.selectMinimalSeverity = 4;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#severity-5"]', function(e) {
    $('a[href="#severity-' + config.triggers.selectMinimalSeverity + '"]').parent().removeClass('active');
    $('a[href="#severity-5"]').parent().addClass('active');

    config.triggers.selectMinimalSeverity = 5;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#settings"]', function(e) {
    e.preventDefault();
});

connectClients(function(err, data) {
    if (err) {
        console.error(err);

        return;
    }

    clients = data;

    getServers(clients, function(err, data) {
        if (err) {
            console.error(err);

            return;
        }

        servers = data;
    });

    getHostGroups(clients, null, function(err, data) {
        if (err) {
            console.error(err);

            return;
        }

        groups = data;
    });

    getHosts(clients, null, null, function(err, data) {
        if (err) {
            console.error(err);

            return;
        }

        hosts = data;

        $('#app').html(templates.main({
            config: config,
            clients: clients,
            servers: servers,
            groups: groups,
            hosts: hosts
        }));

        refresh();
    });
});