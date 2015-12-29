'use strict';

var async = require('async');
var doT = require('dot'); // eslint-disable-line no-unused-vars
var moment = require('moment');

var Zabbix = require('./zabbix');

var config = require('./config');
var templates = require('./templates');

var client = null;
var groups = {};
var hosts = {};

var triggers = {};
var events = {};
var httptests = {};
var alerts = {};

var view = 'triggers';
var timeoutId;

/*
 * Functions
 */

function connectClient(callback) {
  var client = new Zabbix(config.server.url, config.server.user, config.server.password, config.debug);

  client.login(function(err) {
    if (err) {
      return callback(err, null);
    }

    client.config = config.server;

    return callback(null, client);
  });
}

function getHostGroups(client, callback) {
  var groups = {};

  client.send('hostgroup.get', {
    output: 'extend'
  }, function(err, data) {
    if (err) {
      return callback(err, null);
    }

    groups = data.result;

    return callback(null, groups);
  });
}

function getHosts(client, groups, callback) {
  var hosts = {};

  client.send('host.get', {
    output: 'extend'
  }, function(err, data) {
    if (err) {
      return callback(err, null);
    }

    hosts = data.result;

    return callback(null, hosts);
  });
}

function getTriggers(client, groups, hosts, callback) {
  var triggers = {};

  var params = {
    output: ['triggerid', 'description', 'expression', 'lastchange', 'priority', 'value', 'host'],
    expandData: 1,
    expandDescription: 1,
    expandExpression: 1,
    monitored: 1,
    min_severity: config.triggers.severity
  };

  if (config.triggers.status == 1) {
    params.only_true = 1;
  } else if (config.triggers.status == 2) {
    params.filter = {
      value: 1
    }
  }

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
    params.maintenance = true;
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
      return callback(err, null);
    }

    triggers = data.result;

    return callback(null, triggers);
  });
}

function getEvents(client, groups, hosts, callback) {
  var events = {};

  var params = {
    output: ['eventid', 'acknowledged', 'clock', 'object', 'source', 'value'],
    expandData: 1,
    expandDescription: 1,
    expandExpression: 1,
    time_from: (Number(new Date().getTime() / 1000).toFixed() - config.events.period),
    selectHosts: 'extend',
    selectRelatedObject: 'extend'
  };

  if (config.events.sortField) {
    params.sortfield = config.events.sortField;
  }

  if (config.events.sortOrder) {
    params.sortorder = config.events.sortOrder;
  }

  client.send('event.get', params, function(err, data) {
    if (err) {
      return callback(err, null);
    }

    events = data.result;

    return callback(null, events);
  });
}

function getHTTPTests(client, groups, hosts, callback) {
  var httptests = {};

  var params = {
    output: ['httptestid', 'status', 'name', 'description', 'nextcheck', 'delay'],
    monitored: 1,
    expandName: 1,
    expandStepName: 1,
    selectSteps: 'extend',
    selectHosts: 'extend'
  };

  if (config.httptests.sortField) {
    params.sortfield = config.httptests.sortField;
  }

  if (config.httptests.sortOrder) {
    params.sortorder = config.httptests.sortOrder;
  }

  client.send('httptest.get', params, function(err, data) {
    if (err) {
      return callback(err);
    }

    httptests = data.result;

    async.each(httptests, function(test, callback) {
      client.send('item.get', {
        output: ['lastvalue'],
        hostids: test.hosts[0].hostid,
        webitems: 1,
        search: {
          key_: 'web.test.fail[' + test.name + ']'
        }
      }, function(err, data) {
        if (err) {
          return callback(err);
        }

        test.lastvalue = data.result[0].lastvalue;

        return callback(null);
      });
    }, function(err) {
      if (err) {
        return callback(err, null, null);
      }

      return callback(null, httptests);
    });
  });
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
  getTriggers(client, null, null, function(err, data) {
    if (err) {
      console.error(err); // eslint-disable-line no-console

      return;
    }

    if (view !== 'triggers') {
      return;
    }

    triggers = data;
    alerts.triggers = {
      ok: 0,
      disaster: 0,
      high: 0,
      average: 0,
      warning: 0,
      information: 0,
      notclassified: 0
    };

    for (var i = 0, j = triggers.length; i < j; i++) {
      if (triggers[i].value === '0') {
        alerts.triggers.ok++;

        continue;
      }

      switch (triggers[i].priority) {
      case '5':
        alerts.triggers.disaster++;
        break;

      case '4':
        alerts.triggers.high++;
        break;

      case '3':
        alerts.triggers.average++;
        break;


      case '2':
        alerts.triggers.warning++;
        break;


      case '1':
        alerts.triggers.information++;
        break;


      case '0':
        alerts.triggers.notclassified++;
        break;
      }
    }

    $('#menu').html(templates.menu({
      config: config,
      view: view
    }));

    $('#view').html(templates.viewTriggers({
      config: config,
      triggers: triggers,
      alerts: alerts
    }));
  });
}

function showEventsView() {
  view = 'events';

  getEvents(client, null, null, function(err, data) {
    if (err) {
      console.error(err); // eslint-disable-line no-console

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
  getHTTPTests(client, null, null, function(err, data) {
    if (err) {
      console.error(err); // eslint-disable-line no-console

      return;
    }

    if (view !== 'web') {
      return;
    }

    httptests = data;
    alerts.httptests = 0;

    for (var i = 0, j = httptests.length; i < j; i++) {
      if (httptests[i].lastvalue !== '0') {
        alerts.httptests++;
      }
    }

    $('#menu').html(templates.menu({
      config: config,
      view: view
    }));

    $('#view').html(templates.viewWeb({
      config: config,
      httptests: httptests,
      alerts: alerts
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
  $('a[href="#triggers-status-recent-problem"]').parent().removeClass('active');
  $('a[href="#triggers-status-problem"]').parent().removeClass('active');
  $('a[href="#triggers-status-any"]').parent().addClass('active');

  config.triggers.status = 0;
  refresh();

  e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-status-recent-problem"]', function(e) {
  $('a[href="#triggers-status-any"]').parent().removeClass('active');
  $('a[href="#triggers-status-problem"]').parent().removeClass('active');
  $('a[href="#triggers-status-recent-problem"]').parent().addClass('active');

  config.triggers.status = 1;
  refresh();

  e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-status-problem"]', function(e) {
  $('a[href="#triggers-status-any"]').parent().removeClass('active');
  $('a[href="#triggers-status-recent-problem"]').parent().removeClass('active');
  $('a[href="#triggers-status-problem"]').parent().addClass('active');

  config.triggers.status = 2;
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

$('body').on('click', 'a[href="#events-sortfield-eventid"]', function(e) {
  $('a[href="#events-sortfield-' + config.events.sortField + '"]').parent().removeClass('active');
  $('a[href="#events-sortfield-eventid"]').parent().addClass('active');

  config.events.sortField = 'eventid';
  refresh();

  e.preventDefault();
});

$('body').on('click', 'a[href="#events-sortfield-objectid"]', function(e) {
  $('a[href="#events-objectid-' + config.events.sortField + '"]').parent().removeClass('active');
  $('a[href="#events-objectid-eventid"]').parent().addClass('active');

  config.events.sortField = 'objectid';
  refresh();

  e.preventDefault();
});

$('body').on('click', 'a[href="#events-sortfield-clock"]', function(e) {
  $('a[href="#events-sort-' + config.events.sortField + '"]').parent().removeClass('active');
  $('a[href="#events-sort-clock"]').parent().addClass('active');

  config.events.sortField = 'clock';
  refresh();

  e.preventDefault();
});

$('body').on('click', 'a[href="#events-sortorder-ASC"]', function(e) {
  $('a[href="#events-sortorder-' + config.events.sortField + '"]').parent().removeClass('active');
  $('a[href="#events-sortorder-ASC"]').parent().addClass('active');

  config.events.sortOrder = 'ASC';
  refresh();

  e.preventDefault();
});

$('body').on('click', 'a[href="#events-sortorder-DESC"]', function(e) {
  $('a[href="#events-sortorder-' + config.events.sortField + '"]').parent().removeClass('active');
  $('a[href="#events-sortorder-DESC"]').parent().addClass('active');

  config.events.sortOrder = 'DESC';
  refresh();

  e.preventDefault();
});

$('body').on('click', 'a[href="#httptests-sortfield-httptestid"]', function(e) {
  $('a[href="#httptests-sortfield-' + config.httptests.sortField + '"]').parent().removeClass('active');
  $('a[href="#httptests-sortfield-httptestid"]').parent().addClass('active');

  config.httptests.sortField = 'httptestid';
  refresh();

  e.preventDefault();
});

$('body').on('click', 'a[href="#httptests-sortfield-name"]', function(e) {
  $('a[href="#httptests-sort-' + config.httptests.sortField + '"]').parent().removeClass('active');
  $('a[href="#httptests-sort-name"]').parent().addClass('active');

  config.httptests.sortField = 'name';
  refresh();

  e.preventDefault();
});

$('body').on('click', 'a[href="#httptests-sortorder-ASC"]', function(e) {
  $('a[href="#httptests-sortorder-' + config.httptests.sortField + '"]').parent().removeClass('active');
  $('a[href="#httptests-sortorder-ASC"]').parent().addClass('active');

  config.httptests.sortOrder = 'ASC';
  refresh();

  e.preventDefault();
});

$('body').on('click', 'a[href="#httptests-sortorder-DESC"]', function(e) {
  $('a[href="#httptests-sortorder-' + config.httptests.sortField + '"]').parent().removeClass('active');
  $('a[href="#httptests-sortorder-DESC"]').parent().addClass('active');

  config.httptests.sortOrder = 'DESC';
  refresh();

  e.preventDefault();
});

/*
 * Script
 */

connectClient(function(err, data) {
  if (err) {
    console.error(err); // eslint-disable-line no-console

    return;
  }

  client = data;

  getHostGroups(client, function(err, data) {
    if (err) {
      console.error(err); // eslint-disable-line no-console

      return;
    }

    groups = data;
  });

  getHosts(client, null, function(err, data) {
    if (err) {
      console.error(err); // eslint-disable-line no-console

      return;
    }

    hosts = data;
  });

  $('#app').html(templates.app({
    config: config,
    groups: groups,
    hosts: hosts
  }));

  refresh();
});