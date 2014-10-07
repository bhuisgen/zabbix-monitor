'use strict';

var doT = require('dot');
var moment = require('moment');

var Zabbix = require('./zabbix');

var config = require('./config');
var templates = require('./templates');

var clients = {};
var servers = {};
var groups = {};
var hosts = {};

var triggers = {};
var events = {};
var httptests = {};

var view = 'triggers';
var timeoutId;

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
            client.send('hostgroup.get', {
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
            client.send('host.get', {
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

function getTriggers(clients, servers, groups, hosts, callback) {
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
                output: ['triggerid', 'description', 'expression', 'lastchange', 'priority', 'value', 'host'],
                expandData: 1,
                expandDescription: 1,
                expandExpression: 1,
                monitored: 1,
                min_severity: config.triggers.severity
            };

            if (config.triggers.sortField) {
                params.sortfield = config.triggers.sortField;
            }

            if (config.triggers.sortOrder) {
                params.sortorder = config.triggers.sortOrder;
            }

            if (config.triggers.age) {
                params.lastChangeSince = moment().subtract(config.triggers.age, 'days').unix();
            }

            if (config.triggers.selectInMaintenance) {
                params.maintenance = 1;
            }

            if (config.triggers.selectWithUnacknowledgedEvents) {
                params.withUnacknowledgedEvents = 1;
            }

            if (config.triggers.selectWithAcknowledgedEvents) {
                params.withAcknowledgedEvents = 1;
            }

            if (config.triggers.selectWithLastEventUnacknowledged) {
                params.withLastEventUnacknowledged = 1;
            }

            if (config.triggers.selectWithLastEventUnacknowledged) {
                params.withLastEventUnacknowledged = 1;
            }

            if (config.triggers.selectSkipDependent) {
                params.skipDependent = 1;
            }

            if (config.triggers.lastChangeSince) {
                params.lastChangeSince = config.triggers.lastChangeSince;
            }

            if (config.triggers.limit) {
                params.limit = config.triggers.limit;
            }

            client.send('trigger.get', params, function(err, data) {
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

function getEvents(clients, servers, groups, hosts, callback) {
    var events = {};

    var keys = Object.keys(clients);
    var count = keys.length;

    var doGetEvents = function(client) {
        count--;

        if (servers && (servers.indexOf(client.config.name) === -1)) {
            if (!count) {
                callback(null, events);
            }
        } else {
            var params = {
                output: ['eventid', 'acknowledged', 'clock', 'object', 'source', 'value'],
                expandDescription: 1,
                time_from: (Number(new Date().getTime() / 1000).toFixed() - config.events.period),
                selectHosts: 'extend',
                selectRelatedObject: 'extend',
                sortfield: ['clock', 'eventid'],
                sortorder: 'DESC'
            };

            client.send('event.get', params, function(err, data) {
                if (err) {
                    callback(err, null);
                }

                events[client.config.name] = data.result;

                if (!count) {
                    callback(null, events);
                }
            });
        }
    };

    for (var i = 0, j = count; i < j; i++) {
        doGetEvents(clients[keys[i]]);
    }
}

function getHTTPTests(clients, servers, groups, hosts, callback) {
    var httptests = {};

    var keys = Object.keys(clients);
    var count = keys.length;

    var doGetHTTPTests = function(client) {
        count--;

        if (servers && (servers.indexOf(client.config.name) === -1)) {
            if (!count) {
                callback(null, events);
            }
        } else {
            var params = {
                output: ['httptestid', 'status', 'name', 'description', 'nextcheck', 'delay'],
                monitored: 1,
                expandName: 1,
                expandStepName: 1,
                selectSteps: 'extend',
                selectHosts: 'extend',
                sortfield: ['name'],
                sortorder: 'ASC'
            };

            client.send('httptest.get', params, function(err, data) {
                if (err) {
                    callback(err, null);
                }

                httptests[client.config.name] = data.result;

                if (!count) {
                    callback(null, httptests);
                }
            });
        }
    };

    for (var i = 0, j = count; i < j; i++) {
        doGetHTTPTests(clients[keys[i]]);
    }
}

function showSystemView() {
    $('#menu').html(templates.menu({
        config: config,
        view: view
    }));

    $('#view').html(templates.viewSystem({}));
}

function showHostsView() {
    $('#menu').html(templates.menu({
        config: config,
        view: view
    }));

    $('#view').html(templates.viewHosts({}));
}

function showIssuesView() {
    $('#menu').html(templates.menu({
        config: config,
        view: view
    }));

    $('#view').html(templates.viewIssues({}));
}

function showTriggersView() {
    getTriggers(clients, null, null, null, function(err, data) {
        if (err) {
            console.error(err);

            return;
        }

        if (view !== 'triggers') {
            return;
        }

        triggers = data;
        triggers.alerts = {
            disaster: 0,
            high: 0,
            average: 0,
            warning: 0,
            information: 0,
            notclassified: 0
        };
        
        if (config.alerts) {
            for (var server in triggers) {
                for (var i = 0; i < triggers[server].length; i++) {
                    if (triggers[server][i].value === '0') {
                        continue;
                    }

                    switch (triggers[server][i].priority) {
                        case '5':
                            triggers.alerts.disaster++;
                            break;

                        case '4':
                            triggers.alerts.high++;
                            break;

                        case '3':
                            triggers.alerts.average++;
                            break;


                        case '2':
                            triggers.alerts.warning++;
                            break;


                        case '1':
                            triggers.alerts.information++;
                            break;


                        case '0':
                            triggers.alerts.notclassified++;
                            break;
                    }
                }
            }
        }

        $('#menu').html(templates.menu({
            config: config,
            view: view
        }));

        $('#view').html(templates.viewTriggers({
            config: config,
            triggers: triggers,
        }));
    });
}

function showEventsView() {
    view = 'events';

    getEvents(clients, null, null, null, function(err, data) {
        if (err) {
            console.error(err);

            return;
        }
        if (view !== 'events') {
            return;
        }

        events = data;

        $('#menu').html(templates.menu({
            config: config,
            view: view
        }));

        $('#view').html(templates.viewEvents({
            config: config,
            events: events
        }));
    });
}

function showWebView() {
    $('#menu').html(templates.menu({
        config: config,
        view: view
    }));

    getHTTPTests(clients, null, null, null, function(err, data) {
        if (err) {
            console.error(err);

            return;
        }

        if (view !== 'web') {
            return;
        }

        httptests = data;

        $('#menu').html(templates.menu({
            config: config,
            view: view
        }));

        $('#view').html(templates.viewWeb({
            config: config,
            httptests: httptests
        }));
    });
}

function refresh() {
    if (timeoutId) {
        clearTimeout(timeoutId);
    }

    switch (view) {
        case 'system':
            showSystemView();
            break;

        case 'hosts':
            showHostsView();
            break;

        case 'issues':
            showIssuesView();
            break;

        case 'triggers':
            showTriggersView();
            break;

        case 'events':
            showEventsView();
            break;

        case 'web':
            showWebView();
            break;

        default:
            break;
    }

    if (config.refresh > 0) {
        timeoutId = setTimeout(refresh, config.refresh * 1000);
    }
}

$('body').on('click', 'a[href="#system"]', function(e) {
    view = 'system';
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#hosts"]', function(e) {
    view = 'hosts';
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#issues"]', function(e) {
    view = 'issues';
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers"]', function(e) {
    view = 'triggers';
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#events"]', function(e) {
    view = 'events';
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#web"]', function(e) {
    view = 'web';
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
    refresh();

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

$('body').on('click', 'a[href="#triggers-status-any"]', function(e) {
    $('a[href="#triggers-status-problem"]').parent().removeClass('active');
    $('a[href="#triggers-status-any"]').parent().addClass('active');

    config.triggers.status = 0;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-status-problem"]', function(e) {
    $('a[href="#triggers-status-any"]').parent().removeClass('active');
    $('a[href="#triggers-status-problem"]').parent().addClass('active');

    config.triggers.status = 1;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-severity-0"]', function(e) {
    $('a[href="#triggers-severity-' + config.triggers.selectMinimalSeverity + '"]').parent().removeClass('active');
    $('a[href="#triggers-severity-0"]').parent().addClass('active');

    config.triggers.severity = 0;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-severity-1"]', function(e) {
    $('a[href="#triggers-severity-' + config.triggers.selectMinimalSeverity + '"]').parent().removeClass('active');
    $('a[href="#triggers-severity-1"]').parent().addClass('active');

    config.triggers.severity = 1;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-severity-2"]', function(e) {
    $('a[href="#triggers-severity-' + config.triggers.selectMinimalSeverity + '"]').parent().removeClass('active');
    $('a[href="#triggers-severity-2"]').parent().addClass('active');

    config.triggers.severity = 2;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-severity-3"]', function(e) {
    $('a[href="#triggers-severity-' + config.triggers.selectMinimalSeverity + '"]').parent().removeClass('active');
    $('a[href="#triggers-severity-3"]').parent().addClass('active');

    config.triggers.severity = 3;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-severity-4"]', function(e) {
    $('a[href="#triggers-severity-' + config.triggers.selectMinimalSeverity + '"]').parent().removeClass('active');
    $('a[href="#triggers-severity-4"]').parent().addClass('active');

    config.triggers.severity = 4;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-severity-5"]', function(e) {
    $('a[href="#triggers-severity-' + config.triggers.selectMinimalSeverity + '"]').parent().removeClass('active');
    $('a[href="#triggers-severity-5"]').parent().addClass('active');

    config.triggers.severity = 5;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-age-0"]', function(e) {
    $('a[href="#triggers-age-' + config.triggers.age + '"]').parent().removeClass('active');
    $('a[href="#triggers-age-0"]').parent().addClass('active');

    config.triggers.age = 0;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-age-1"]', function(e) {
    $('a[href="#triggers-age-' + config.triggers.age + '"]').parent().removeClass('active');
    $('a[href="#triggers-age-1"]').parent().addClass('active');

    config.triggers.age = 1;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-age-2"]', function(e) {
    $('a[href="#triggers-age-' + config.triggers.age + '"]').parent().removeClass('active');
    $('a[href="#triggers-age-2"]').parent().addClass('active');

    config.triggers.age = 2;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-age-7"]', function(e) {
    $('a[href="#triggers-age-' + config.triggers.age + '"]').parent().removeClass('active');
    $('a[href="#triggers-age-7"]').parent().addClass('active');

    config.triggers.age = 7;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-age-30"]', function(e) {
    $('a[href="#triggers-age-' + config.triggers.age + '"]').parent().removeClass('active');
    $('a[href="#triggers-age-30"]').parent().addClass('active');

    config.triggers.age = 30;
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-sortfield-triggerid"]', function(e) {
    $('a[href="#triggers-sortfield-' + config.triggers.sortField + '"]').parent().removeClass('active');
    $('a[href="#triggers-sortfield-triggerid"]').parent().addClass('active');

    config.triggers.sortField = 'triggerid';
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-sortfield-priority"]', function(e) {
    $('a[href="#triggers-sortfield-' + config.triggers.sortField + '"]').parent().removeClass('active');
    $('a[href="#triggers-sortfield-priority"]').parent().addClass('active');

    config.triggers.sortField = 'priority';
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-sortfield-lastchange"]', function(e) {
    $('a[href="#triggers-sortfield-' + config.triggers.sortField + '"]').parent().removeClass('active');
    $('a[href="#triggers-sortfield-lastchange"]').parent().addClass('active');

    config.triggers.sortField = 'lastchange';
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-sortfield-hostname"]', function(e) {
    $('a[href="#triggers-sort-' + config.triggers.sortField + '"]').parent().removeClass('active');
    $('a[href="#triggers-sort-hostname"]').parent().addClass('active');

    config.triggers.sortField = 'hostname';
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-sortfield-description"]', function(e) {
    $('a[href="#triggers-sortfield-' + config.triggers.sortField + '"]').parent().removeClass('active');
    $('a[href="#triggers-sortfield-description"]').parent().addClass('active');

    config.triggers.sortField = 'description';
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-sortorder-ASC"]', function(e) {
    $('a[href="#triggers-sortorder-' + config.triggers.sortField + '"]').parent().removeClass('active');
    $('a[href="#triggers-sortorder-ASC"]').parent().addClass('active');

    config.triggers.sortOrder = 'ASC';
    refresh();

    e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-sortorder-DESC"]', function(e) {
    $('a[href="#triggers-sortorder-' + config.triggers.sortField + '"]').parent().removeClass('active');
    $('a[href="#triggers-sortorder-DESC"]').parent().addClass('active');

    config.triggers.sortOrder = 'DESC';
    refresh();

    e.preventDefault();
});

/*
 * Script
 */

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
    });

    console.log(templates);

    $('#app').html(templates.app({
        config: config,
        clients: clients,
        servers: servers,
        groups: groups,
        hosts: hosts
    }));

    refresh();
});