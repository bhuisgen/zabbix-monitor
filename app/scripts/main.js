'use strict';

var async = require('async');
var _ = require('lodash');
var moment = require('moment');

var config = require('./config');

var doT = require('dot'); // eslint-disable-line no-unused-vars
var Zabbix = require('./zabbix');

var templates = require('./templates');

/*
 * Variables
 */

var client = null;
var groups = {};
var hosts = {};
var view = 'triggers';
var timeoutId = null;
var error = null;

var triggers = {
  data: null,
  alerts: null
};

var events = {
  data: null,
  alerts: null
};

var httptests = {
  data: null,
  alerts: null
};

/*
 * API functions
 */

function connectClient(callback) {
  var client = new Zabbix(config.server.url, config.server.user, config.server.password, config.server.options);

  client.login(function(err) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, client);
  });
}

function getHostGroups(client, callback) {
  var params = {
    output: 'extend',
    sortfield: 'name'
  };

  client.send('hostgroup.get', params, function(err, data) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, data.result);
  });
}

function getHosts(client, callback) {
  var params = {
    output: 'extend',
    sortfield: 'name'
  };

  client.send('host.get', params, function(err, data) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, data.result);
  });
}

function getTriggers(client, callback) {
  var params = {
    output: ['triggerid', 'description', 'expression', 'lastchange', 'priority', 'value', 'host'],
    expandData: 1,
    expandDescription: 1,
    expandExpression: 1,
    monitored: 1,
    min_severity: config.triggers.severity
  };

  if (config.triggers.groupids) {
    params.groupids = config.triggers.groupids;
  }

  if (config.triggers.hostids) {
    params.hostids = config.triggers.hostids;
  }

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

    return callback(null, data.result);
  });
}

function getEvents(client, callback) {
  var params = {
    output: ['eventid', 'acknowledged', 'clock', 'object', 'source', 'value'],
    expandData: 1,
    expandDescription: 1,
    expandExpression: 1,
    selectHosts: 'extend',
    selectRelatedObject: 'extend'
  };

  if (config.events.groupids) {
    params.groupids = config.events.groupids;
  }

  if (config.events.hostids) {
    params.hostids = config.events.hostids;
  }

  if (config.events.period) {
      params.time_from = moment().subtract(config.events.period, 'hours').unix();
  }

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

    return callback(null, data.result);
  });
}

function getHTTPTests(client, callback) {
  var params = {
    output: ['httptestid', 'status', 'name', 'description', 'nextcheck', 'delay'],
    monitored: 1,
    expandName: 1,
    expandStepName: 1,
    selectSteps: 'extend',
    selectHosts: 'extend'
  };

  if (config.httptests.groupids) {
    params.groupids = config.httptests.groupids;
  }

  if (config.httptests.hostids) {
    params.hostids = config.httptests.hostids;
  }

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

    async.each(data.result, function(test, callback) {
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
        return callback(err, null);
      }

      return callback(null, data.result);
    });
  });
}

/*
 * Views
 */

function showErrorView() {
  $('#view').html(templates.viewError({
    config: config,
    error: error
  }));
}

function showTriggersView() {
  getTriggers(client, function(err, data) {
    if (err) {
      error = new Error("Failed to get triggers (" + err.message + ")");
      refresh();

      return;
    }

    if (view !== 'triggers') {
      return;
    }

    triggers.data = data;
    triggers.alerts = {
      ok: 0,
      disaster: 0,
      high: 0,
      average: 0,
      warning: 0,
      information: 0,
      notclassified: 0
    };

    for (var i = 0, j = triggers.data.length; i < j; i++) {
      if (triggers.data[i].value === '0') {
        triggers.alerts.ok++;

        continue;
      }

      switch (triggers.data[i].priority) {
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

    $('#view').html(templates.viewTriggers({
      moment: moment,
      config: config,
      groups: groups,
      hosts: hosts,
      triggers: triggers
    }));
  });
}

function showEventsView() {
  view = 'events';

  getEvents(client, function(err, data) {
    if (err) {
      error = new Error("Failed to get events (" + err.message + ")");
      refresh();
      
      return;
    }

    if (view !== 'events') {
      return;
    }

    events.data = data;

    $('#view').html(templates.viewEvents({
      moment: moment,
      config: config,
      groups: groups,
      hosts: hosts,
      events: events
    }));
  });
}

function showWebView() {
  getHTTPTests(client, function(err, data) {
    if (err) {
      error = new Error("Failed to get http tests (" + err.message + ")");
      refresh();

      return;
    }

    if (view !== 'web') {
      return;
    }

    httptests.data = data;
    httptests.alerts = 0;

    for (var i = 0, j = httptests.data.length; i < j; i++) {
      if (httptests.data[i].lastvalue !== '0') {
        httptests.alerts++;
      }
    }

    $('#view').html(templates.viewWeb({
      moment: moment,
      config: config,
      groups: groups,
      hosts: hosts,
      httptests: httptests
    }));
  });
}

/*
 * View events
 */

$('body').on('click', 'a[href^="#view-"]', function(e) {
  var m = $(this).attr('href').match(/^#view-(.+)/) || [""];
  if (m[1]) {
    view = m[1];

    refresh();
  }

  e.preventDefault();
});

$('body').on('click', 'a[href="#refresh"]', function(e) {
  refresh();

  e.preventDefault();
});

$('body').on('click', 'a[href^="#refresh-"]', function(e) {
  var m = $(this).attr('href').match(/^#refresh-(\d+)/) || [""];
  if (m[1]) {
    config.refresh = parseInt(m[1]);

    refresh();
  }

  e.preventDefault();
});

$('body').on('click', 'a[href^="#triggers-status-"]', function(e) {
  var m = $(this).attr('href').match(/^#triggers-status-(\d+)/) || [""];
  if (m[1]) {
     config.triggers.status = parseInt(m[1]);

     $('a[href^="#triggers-status-"]').parent().removeClass('active');
     $(this).parent().addClass('active')

     refresh();
  }

  e.preventDefault();
});

$('body').on('click', 'a[href^="#triggers-severity-"]', function(e) {
  var m = $(this).attr('href').match(/^#triggers-severity-(\d+)/) || [""];
  if (m[1]) {
     config.triggers.severity = parseInt(m[1]);

     $('a[href^="#triggers-severity-"]').parent().removeClass('active');
     $(this).parent().addClass('active')

     refresh();
  }

  e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-age"]', function(e) {
  delete config.triggers.age;

  refresh();
  e.preventDefault();
});

$('body').on('click', 'a[href^="#triggers-age-"]', function(e) {
  var m = $(this).attr('href').match(/^#triggers-age-(\d+)/) || [""];
  if (m[1]) {
     config.triggers.age = parseInt(m[1]);

     $('a[href^="#triggers-age-"]').parent().removeClass('active');
     $(this).parent().addClass('active')

     refresh();
  }

  e.preventDefault();
});

$('body').on('click', 'a[href^="#triggers-sortfield-"]', function(e) {
  var m = $(this).attr('href').match(/^#triggers-sortfield-(.+)/) || [""];
  if (m[1]) {
     config.triggers.sortField = m[1];

     $('a[href^="#triggers-sortfield-"]').parent().removeClass('active');
     $(this).parent().addClass('active')

     refresh();
  }

  e.preventDefault();
});

$('body').on('click', 'a[href^="#triggers-sortorder-"]', function(e) {
  var m = $(this).attr('href').match(/^#triggers-sortorder-(.+)/) || [""];
  if (m[1]) {
     config.triggers.sortOrder = m[1];

     $('a[href^="#triggers-sortorder-"]').parent().removeClass('active');
     $(this).parent().addClass('active')

     refresh();
  }

  e.preventDefault();
});

$('body').on('click', 'a[href="#triggers-group"]', function(e) {
  delete config.triggers.groupids;

  refresh();
  e.preventDefault();
});

$('body').on('click', 'a[href^="#triggers-group-"]', function(e) {
  var m = $(this).attr('href').match(/^#triggers-group-(\d+)/) || [""];
  if (m[1]) {
    config.triggers.groupids = m[1];

    refresh();
  }

  e.preventDefault();
});

$('body').on('click', 'a[href="#events-period"]', function(e) {
  delete config.events.period;

  refresh();
  e.preventDefault();
});

$('body').on('click', 'a[href^="#events-period-"]', function(e) {
  var m = $(this).attr('href').match(/^#events-period-(\d+)/) || [""];
  if (m[1]) {
     config.events.period = parseInt(m[1]);

     $('a[href^="#events-period-"]').parent().removeClass('active');
     $(this).parent().addClass('active')

     refresh();
  }

  e.preventDefault();
});

$('body').on('click', 'a[href^="#events-sortfield-"]', function(e) {
  var m = $(this).attr('href').match(/^#events-sortfield-(.+)/) || [""];
  if (m[1]) {
     config.events.sortField = m[1];

     $('a[href^="#events-sortfield-"]').parent().removeClass('active');
     $(this).parent().addClass('active')

     refresh();
  }

  e.preventDefault();
});

$('body').on('click', 'a[href^="#events-sortorder-"]', function(e) {
  var m = $(this).attr('href').match(/^#events-sortorder-(.+)/) || [""];
  if (m[1]) {
     config.events.sortOrder = m[1];

     $('a[href^="#events-sortorder-"]').parent().removeClass('active');
     $(this).parent().addClass('active')

     refresh();
  }

  e.preventDefault();
});

$('body').on('click', 'a[href="#events-group"]', function(e) {
  delete config.events.groupids;

  refresh();
  e.preventDefault();
});

$('body').on('click', 'a[href^="#events-group-"]', function(e) {
  var m = $(this).attr('href').match(/^#events-group-(\d+)/) || [""];
  if (m[1]) {
    config.events.groupids = m[1];

    refresh();
  }

  e.preventDefault();
});

$('body').on('click', 'a[href^="#httptests-sortfield-"]', function(e) {
  var m = $(this).attr('href').match(/^#httptests-sortfield-(.+)/) || [""];
  if (m[1]) {
     config.httptests.sortField = m[1];

     $('a[href^="#httptests-sortfield-"]').parent().removeClass('active');
     $(this).parent().addClass('active')

     refresh();
  }

  e.preventDefault();
});

$('body').on('click', 'a[href^="#httptests-sortorder-"]', function(e) {
  var m = $(this).attr('href').match(/^#httptests-sortorder-(.+)/) || [""];
  if (m[1]) {
     config.httptests.sortOrder = m[1];

     $('a[href^="#httptests-sortorder-"]').parent().removeClass('active');
     $(this).parent().addClass('active')

     refresh();
  }

  e.preventDefault();
});

$('body').on('click', 'a[href="#httptests-group"]', function(e) {
  delete config.httptests.groupids;

  refresh();
  e.preventDefault();
});

$('body').on('click', 'a[href^="#httptests-group-"]', function(e) {
  var m = $(this).attr('href').match(/^#httptests-group-(\d+)/) || [""];
  if (m[1]) {
    config.httptests.groupids = m[1];

    refresh();
  }

  e.preventDefault();
});

/*
 * Application
 */

function init() {
  config = _.defaults(config, {
    server: {},

    refresh: 30,

    alerts: {
      enable: true,
      showOnlyProblems: false
    },

    triggers: {
      status: 1,
      severity: 2,
      age: 24,
      sortField: 'priority',
      sortOrder: 'DESC',
      selectInMaintenance: false,
      selectWithUnacknowledgedEvents: false,
      selectWithAcknowledgedEvents: false,
      selectWithLastEventUnacknowledged: true,
      selectSkipDependent: true,
      selectMinimalSeverity: 0,

      showHumanTimes: true
    },

    events: {
      period: 1,
      sortField: 'clock',
      sortOrder: 'DESC',

      showHumanTimes: false
    },

    httptests: {
      sortField: 'name',
      sortOrder: 'ASC',

      showHumanTimes: false
    }
  });

  $('#app').html(templates.app());

  connectClient(function(err, data) {
    if (err) {
      error = new Error("Failed to connect to API (" + err.message + ")");
      refresh();

      return;
    }

    client = data;

    refresh();

    getHostGroups(client, function(err, data) {
      if (err) {
        error = new Error("Failed to get hostgroups (" + err.message + ")");
        refresh();

        return;
      }

      groups = data;

      refresh();
    });

    getHosts(client, function(err, data) {
      if (err) {
        error = new Error("Failed to get hosts (" + err.message + ")");
        refresh();

        return;
      }

      groups = data;

      refresh();
    })
  });
}

function refresh() {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  $('#menu').html(templates.menu({
    config: config,
    view: view
  }));

  if (error) {
    showErrorView();

    error = null;
    client = null;
  } else {
    if (!client) {
      init();

      return;
    }

    switch (view) {
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
  }

  if (config.refresh > 0) {
    timeoutId = setTimeout(refresh, config.refresh * 1000);
  }
}

init();