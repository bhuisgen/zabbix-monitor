'use strict';

var async = require('async');
var _ = require('lodash');
var moment = require('moment');

var config = require('./config');

var doT = require('dot'); // eslint-disable-line no-unused-vars
var Zabbix = require('./zabbix');

var templates = require('./templates');

/*
 * Defines
 */

var DEFAULT_VIEW = 'triggers';
var LOCALSTORAGE_KEY_CONFIG = 'zabbix-monitor.config';

/*
 * Variables
 */

var zabbix = null;
var groups = {};
var hosts = {};
var view = DEFAULT_VIEW;
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

function connectToServer(callback) {
  callback = callback || function() {
    return true;
  };

  var zabbix = new Zabbix(config.server.url, config.server.user, config.server.password, config.server.options);

  zabbix.login(function(err) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, zabbix);
  });
}

function getHostGroups(zabbix, callback) {
  callback = callback || function() {
    return true;
  };

  var params = {
    output: 'extend',
    sortfield: 'name',
    monitored_hosts: true
  };

  zabbix.send('hostgroup.get', params, function(err, data) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, data.result);
  });
}

function getHosts(zabbix, callback) {
  callback = callback || function() {
    return true;
  };

  var params = {
    output: 'extend',
    sortfield: 'name',
    monitored_hosts: true
  };

  zabbix.send('host.get', params, function(err, data) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, data.result);
  });
}

function getTriggers(zabbix, callback) {
  callback = callback || function() {
    return true;
  };

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

  zabbix.send('trigger.get', params, function(err, data) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, data.result);
  });
}

function getEvents(zabbix, callback) {
  callback = callback || function() {
    return true;
  };

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

  zabbix.send('event.get', params, function(err, data) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, data.result);
  });
}

function getHTTPTests(zabbix, callback) {
  callback = callback || function() {
    return true;
  };

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

  zabbix.send('httptest.get', params, function(err, data) {
    if (err) {
      return callback(err);
    }

    async.each(data.result, function(test, callback) {
      zabbix.send('item.get', {
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

function showStartupModal() {
  $('#app').html(templates.app());
  $('#modal').html(templates.modalStartup({
    config: config
  }));

  $('#modalStartup').modal({
    backdrop: 'static',
    keyboard: false
  });
}

$('body').on('keyup', '#modalStartup #serverHostname', function(e) {
  e.preventDefault();

  if (!$('#modalStartup').find('#serverHostname').val()) {
    return;
  }

  $('#modalStartup').find('#serverHostname')
    .closest('.form-group')
    .removeClass('has-error');
  $('#modalStartup').find('#serverHostname')
    .removeAttr('aria-describedby')
    .closest('div')
    .find('span').remove();
})

$('body').on('keyup', '#modalStartup #serverUser', function(e) {
  e.preventDefault();

  if (!$('#modalStartup').find('#serverUser').val()) {
    return;
  }

  $('#modalStartup').find('#serverUser')
    .closest('.form-group')
    .removeClass('has-error');
  $('#modalStartup').find('#serverUser')
    .removeAttr('aria-describedby')
    .closest('div')
    .find('span').remove();
})

$('body').on('keyup', '#modalStartup #serverPassword', function(e) {
  e.preventDefault();

  if (!$('#modalStartup').find('#serverPassword').val()) {
    return;
  }

  $('#modalStartup').find('#serverPassword')
    .closest('.form-group')
    .removeClass('has-error');
  $('#modalStartup').find('#serverPassword')
    .removeAttr('aria-describedby')
    .closest('div')
    .find('span').remove();
})

$('body').on('click', '#modalStartup #startupConnect', function(e) {
  e.preventDefault();

  var hostname = $('#modalStartup').find('#serverHostname').val();
  var server = {
    url:'https://' + hostname + '/api_jsonrpc.php',
    user: $('#modalStartup').find('#serverUser').val(),
    password: $('#modalStartup').find('#serverPassword').val()
  };

  if (!hostname || !server.url.match(/^http(s)?\:\/\/.+$/)) {
    $('#modalStartup').find('#serverHostname')
      .closest('.form-group')
      .addClass('has-error');
    $('#modalStartup').find('#serverHostname')
      .attr('aria-describedby', 'serveurURLErrorStatus')
      .closest('div')
      .append('<span class="glyphicon glyphicon-remove form-control-feedback" aria-hidden="true">')
      .append('<span id="serveurURLErrorStatus" class="sr-only">(error)</span>');
  }

  if (!server.user) {
    $('#modalStartup').find('#serverUser')
      .closest('.form-group')
      .addClass('has-error');
    $('#modalStartup').find('#serverUser')
      .attr('aria-describedby', 'serveurUserErrorStatus')
      .closest('div')
      .append('<span class="glyphicon glyphicon-remove form-control-feedback" aria-hidden="true">')
      .append('<span id="serveurUserErrorStatus" class="sr-only">(error)</span>');
  }

  if (!server.password) {
    $('#modalStartup').find('#serverPassword')
      .closest('.form-group')
      .addClass('has-error');
    $('#modalStartup').find('#serverPassword')
    .attr('aria-describedby', 'serveurPasswordErrorStatus')
    .closest('div')
    .append('<span class="glyphicon glyphicon-remove form-control-feedback" aria-hidden="true">')
    .append('<span id="serveurPasswordErrorStatus" class="sr-only">(error)</span>');
  }

  if (!hostname || !server.url.match(/^http(s)?\:\/\/.+$/) || !server.user || !server.password) {
    return;
  }

  config.server.url = server.url;
  config.server.user = server.user;
  config.server.password = server.password;

  zabbix = new Zabbix(server.url, server.user, server.password);

  zabbix.login(function(err) {
    if (err) {
      $('#modalStartup').find('.form-group').addClass('has-error');
      $('#modalStartup').find('#serverHostname')
        .attr('aria-describedby', 'serveurHostnameErrorStatus')
        .closest('div')
        .append('<span class="glyphicon glyphicon-remove form-control-feedback" aria-hidden="true">')
        .append('<span id="serveurHostnamerrorStatus" class="sr-only">(error)</span>');
      $('#modalStartup').find('#serverUser')
        .attr('aria-describedby', 'serveurUserErrorStatus')
        .closest('div')
        .append('<span class="glyphicon glyphicon-remove form-control-feedback" aria-hidden="true">')
        .append('<span id="serveurUserErrorStatus" class="sr-only">(error)</span>');
      $('#modalStartup').find('#serverPassword')
        .attr('aria-describedby', 'serveurPasswordErrorStatus')
        .closest('div')
        .append('<span class="glyphicon glyphicon-remove form-control-feedback" aria-hidden="true">')
        .append('<span id="serveurPasswordErrorStatus" class="sr-only">(error)</span>');

      return;
    }

    $('#modalStartup').find('.form-group').removeClass('has-error');
    $('#modalStartup').find('#serverURL')
      .closest('div')
      .find('span').remove();
    $('#modalStartup').find('#serverUser')
      .closest('div')
      .find('span').remove();
    $('#modalStartup').find('#serverPassword')
      .closest('div')
      .find('span').remove();

    if ($('#modalStartup').find('#rememberMe').is(':checked')) {
      saveLocalStorage();
    } else {
      clearLocalStorage();
    }

    $('#modalStartup').modal('hide');

    refresh();
  });
});

function render() {
  $('#app').html(templates.app());

  connectToServer(function(err, data) {
    if (err) {
      error = new Error('Failed to connect to API (' + err.message + ')');
      refresh();

      return;
    }

    zabbix = data;

    refresh();

    getHostGroups(zabbix, function(err, data) {
      if (err) {
        error = new Error('Failed to get hostgroups (' + err.message + ')');
        refresh();

        return;
      }

      groups = data;

      refresh();
    });

    getHosts(zabbix, function(err, data) {
      if (err) {
        error = new Error('Failed to get hosts (' + err.message + ')');
        refresh();

        return;
      }

      hosts = data;

      refresh();
    })
  });
}

function refresh(state = true) {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  if (!state) {
    return;
  }

  $('#menu').html(templates.menu({
    config: config,
    view: view
  }));

  if (error) {
    showErrorView();

    error = null;
    zabbix = null;
  } else {
    if (!zabbix) {
      render();

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

$('body').on('click', 'a[href^="#view-"]', function(e) {
  e.preventDefault();

  var m = $(this).attr('href').match(/^#view-(.+)/) || [''];
  if (m[1]) {
    view = m[1];

    refresh();
  }
});

$('body').on('click', 'a[href="#refresh"]', function(e) {
  e.preventDefault();

  refresh();
});

$('body').on('click', 'a[href^="#refresh-"]', function(e) {
  e.preventDefault();

  var m = $(this).attr('href').match(/^#refresh-(\d+)/) || [''];
  if (m[1]) {
    config.refresh = parseInt(m[1]);

    refresh();
  }
});

function showSettingsModal() {
  refresh(false);

  $('#modal').html(templates.modalSettings({
    config: config
  }));

  $('#modalSettings').modal();
}

$('body').on('click', 'a[href="#settings"]', function(e) {
  e.preventDefault();

  showSettingsModal();
})

$('body').on('focusout', '#modalSettings', function(e) {
  e.preventDefault();

  var serverURL = $('#modalSettings').find('#serverURL').val();
  if (!serverURL) {
    return;
  }

  var m = serverURL.match(/^(https\:\/\/)?(.[^\/]+){1}(\/api_jsonrpc\.php)?$/) || [''];
  if (m[0] && m[2]) {
    var prefix = m[1] ? true : false;
    var suffix = m[3] ? true : false;

    if (!prefix) {
      serverURL = 'https://' + serverURL;
    }

    if (!suffix) {
      serverURL = serverURL + '/api_jsonrpc.php';
    }

    $('#modalSettings').find('#serverURL').val(serverURL);
  }
})

$('body').on('keyup', '#modalSettings #serverURL', function(e) {
  e.preventDefault();

  if (!$('#modalSettings').find('#serverURL').val()) {
    return;
  }

  $('#modalSettings').find('#serverURL')
    .closest('.form-group')
    .removeClass('has-error');
  $('#modalSettings').find('#serverURL')
    .removeAttr('aria-describedby')
    .closest('div')
    .find('span').remove();
})

$('body').on('keyup', '#modalSettings #serverUser', function(e) {
  e.preventDefault();

  if (!$('#modalSettings').find('#serverUser').val()) {
    return;
  }

  $('#modalSettings').find('#serverUser')
    .closest('.form-group')
    .removeClass('has-error');
  $('#modalSettings').find('#serverUser')
    .removeAttr('aria-describedby')
    .closest('div')
    .find('span').remove();
})
$('body').on('keyup', '#modalSettings #serverPassword', function(e) {
  e.preventDefault();

  if (!$('#modalSettings').find('#serverPassword').val()) {
    return;
  }

  $('#modalSettings').find('#serverPassword')
    .closest('.form-group')
    .removeClass('has-error');
  $('#modalSettings').find('#serverPassword')
    .removeAttr('aria-describedby')
    .closest('div')
    .find('span').remove();
})

$('body').on('keyup', '#modalSettings', function(e) {
  e.preventDefault();

  $('#modalSettings').find('#settingsTestSuccess').hide();
  $('#modalSettings').find('#settingsTestFailed').hide();
  $('#modalSettings').find('#settingsTest').closest('div').removeClass('has-error', 'has-success');
})

$('body').on('click', '#modalSettings #settingsTest', function(e) {
  e.preventDefault();

  var server = {
    url: $('#modalSettings').find('#serverURL').val(),
    user: $('#modalSettings').find('#serverUser').val(),
    password: $('#modalSettings').find('#serverPassword').val()
  };

  $('#modalSettings').find('#settingsTestMessage').text('');
  $('#modalSettings').find('#settingsTestMessage').removeClass('text-danger text-success');

  if (!server.url || !server.url.match(/^http(s)?\:\/\/.+$/)) {
    $('#modalSettings').find('#serverURL')
      .closest('.form-group')
      .addClass('has-error');
    $('#modalSettings').find('#serverURL')
      .attr('aria-describedby', 'serveurURLErrorStatus')
      .closest('div')
      .append('<span class="glyphicon glyphicon-remove form-control-feedback" aria-hidden="true">')
      .append('<span id="serveurURLErrorStatus" class="sr-only">(error)</span>');
  }

  if (!server.user) {
    $('#modalSettings').find('#serverUser')
      .closest('.form-group')
      .addClass('has-error');
    $('#modalSettings').find('#serverUser')
      .attr('aria-describedby', 'serveurUserErrorStatus')
      .closest('div')
      .append('<span class="glyphicon glyphicon-remove form-control-feedback" aria-hidden="true">')
      .append('<span id="serveurUserErrorStatus" class="sr-only">(error)</span>');
  }

  if (!server.password) {
    $('#modalSettings').find('#serverPassword')
      .closest('.form-group')
      .addClass('has-error');
    $('#modalSettings').find('#serverPassword')
    .attr('aria-describedby', 'serveurPasswordErrorStatus')
    .closest('div')
    .append('<span class="glyphicon glyphicon-remove form-control-feedback" aria-hidden="true">')
    .append('<span id="serveurPasswordErrorStatus" class="sr-only">(error)</span>');
  }

  if (!server.url || !server.user || !server.password) {
    return;
  }

  var test = new Zabbix(server.url, server.user, server.password);

  test.login(function(err) {
    if (err) {
      if (!err.message) {
        err.message = 'Unknown error';
      }

      $('#modalSettings').find('#settingsTestMessage').text(err.message);
      $('#modalSettings').find('#settingsTestMessage').addClass('text-danger').removeClass('text-success');

      return;
    }

    $('#modalSettings').find('#settingsTestMessage').text('Succesfully connected');
    $('#modalSettings').find('#settingsTestMessage').addClass('text-success').removeClass('text-danger');
  });
});

$('body').on('click', '#settingsSave', function(e) {
  e.preventDefault();

  var server = {
    url: $('#modalSettings').find('#serverURL').val(),
    user: $('#modalSettings').find('#serverUser').val(),
    password: $('#modalSettings').find('#serverPassword').val()
  };

  config.server.url = server.url;
  config.server.user = server.user;
  config.server.password = server.password;

  if ($('#modalSettings').find('#storeConfiguration').is(':checked')) {
    saveLocalStorage();
  } else {
    clearLocalStorage();
  }

  zabbix = null;

  $('#modalSettings').modal('hide');
});

$('body').on('hide.bs.modal','#modalSettings', function() {
  refresh();
})

function showErrorView() {
  $('#view').html(templates.viewError({
    config: config,
    error: error
  }));
}

function showTriggersView() {
  getTriggers(zabbix, function(err, data) {
    if (err) {
      error = new Error('Failed to get triggers (' + err.message + ')');
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

$('body').on('click', 'a[href^="#triggers-status-"]', function(e) {
  e.preventDefault();

  var m = $(this).attr('href').match(/^#triggers-status-(\d+)/) || [''];
  if (m[1]) {
    config.triggers.status = parseInt(m[1]);

    $('a[href^="#triggers-status-"]').parent().removeClass('active');
    $(this).parent().addClass('active');

    refresh();
  }
});

$('body').on('click', 'a[href^="#triggers-severity-"]', function(e) {
  e.preventDefault();

  var m = $(this).attr('href').match(/^#triggers-severity-(\d+)/) || [''];
  if (m[1]) {
    config.triggers.severity = parseInt(m[1]);

    $('a[href^="#triggers-severity-"]').parent().removeClass('active');
    $(this).parent().addClass('active');

    refresh();
  }
});

$('body').on('click', 'a[href^="#triggers-age-"]', function(e) {
  e.preventDefault();

  var m = $(this).attr('href').match(/^#triggers-age-(\d+)/) || [''];
  if (m[1]) {
    config.triggers.age = parseInt(m[1]);

    $('a[href^="#triggers-age-"]').parent().removeClass('active');
    $(this).parent().addClass('active');

    refresh();
  }
});

$('body').on('click', 'a[href^="#triggers-sortfield-"]', function(e) {
  e.preventDefault();

  var m = $(this).attr('href').match(/^#triggers-sortfield-(.+)/) || [''];
  if (m[1]) {
    config.triggers.sortField = m[1];

    $('a[href^="#triggers-sortfield-"]').parent().removeClass('active');
    $(this).parent().addClass('active');

    refresh();
  }
});

$('body').on('click', 'a[href^="#triggers-sortorder-"]', function(e) {
  e.preventDefault();

  var m = $(this).attr('href').match(/^#triggers-sortorder-(.+)/) || [''];
  if (m[1]) {
    config.triggers.sortOrder = m[1];

    $('a[href^="#triggers-sortorder-"]').parent().removeClass('active');
    $(this).parent().addClass('active');

    refresh();
  }
});

$('body').on('click', 'a[href="#triggers-group"]', function(e) {
  e.preventDefault();

  delete config.triggers.groupids;

  refresh();
});

$('body').on('click', 'a[href^="#triggers-group-"]', function(e) {
  e.preventDefault();

  var m = $(this).attr('href').match(/^#triggers-group-(\d+)/) || [''];
  if (m[1]) {
    config.triggers.groupids = m[1];

    refresh();
  }
});

function showEventsView() {
  view = 'events';

  getEvents(zabbix, function(err, data) {
    if (err) {
      error = new Error('Failed to get events (' + err.message + ')');
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

$('body').on('click', 'a[href^="#events-period-"]', function(e) {
  e.preventDefault();

  var m = $(this).attr('href').match(/^#events-period-(\d+)/) || [''];
  if (m[1]) {
    config.events.period = parseInt(m[1]);

    $('a[href^="#events-period-"]').parent().removeClass('active');
    $(this).parent().addClass('active');

    refresh();
  }
});

$('body').on('click', 'a[href^="#events-sortfield-"]', function(e) {
  e.preventDefault();

  var m = $(this).attr('href').match(/^#events-sortfield-(.+)/) || [''];
  if (m[1]) {
    config.events.sortField = m[1];

    $('a[href^="#events-sortfield-"]').parent().removeClass('active');
    $(this).parent().addClass('active');

    refresh();
  }
});

$('body').on('click', 'a[href^="#events-sortorder-"]', function(e) {
  e.preventDefault();

  var m = $(this).attr('href').match(/^#events-sortorder-(.+)/) || [''];
  if (m[1]) {
    config.events.sortOrder = m[1];

    $('a[href^="#events-sortorder-"]').parent().removeClass('active');
    $(this).parent().addClass('active');

    refresh();
  }
});

$('body').on('click', 'a[href="#events-group"]', function(e) {
  e.preventDefault();

  delete config.events.groupids;

  refresh();
});

$('body').on('click', 'a[href^="#events-group-"]', function(e) {
  e.preventDefault();

  var m = $(this).attr('href').match(/^#events-group-(\d+)/) || [''];
  if (m[1]) {
    config.events.groupids = m[1];

    refresh();
  }
});

function showWebView() {
  getHTTPTests(zabbix, function(err, data) {
    if (err) {
      error = new Error('Failed to get http tests (' + err.message + ')');
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

$('body').on('click', 'a[href^="#httptests-sortfield-"]', function(e) {
  e.preventDefault();

  var m = $(this).attr('href').match(/^#httptests-sortfield-(.+)/) || [''];
  if (m[1]) {
    config.httptests.sortField = m[1];

    $('a[href^="#httptests-sortfield-"]').parent().removeClass('active');
    $(this).parent().addClass('active');

    refresh();
  }
});

$('body').on('click', 'a[href^="#httptests-sortorder-"]', function(e) {
  e.preventDefault();

  var m = $(this).attr('href').match(/^#httptests-sortorder-(.+)/) || [''];
  if (m[1]) {
    config.httptests.sortOrder = m[1];

    $('a[href^="#httptests-sortorder-"]').parent().removeClass('active');
    $(this).parent().addClass('active');

    refresh();
  }
});

$('body').on('click', 'a[href="#httptests-group"]', function(e) {
  e.preventDefault();

  delete config.httptests.groupids;

  refresh();
});

$('body').on('click', 'a[href^="#httptests-group-"]', function(e) {
  e.preventDefault();

  var m = $(this).attr('href').match(/^#httptests-group-(\d+)/) || [''];
  if (m[1]) {
    config.httptests.groupids = m[1];

    refresh();
  }
});

/*
 * Functions
 */

function loadConfiguration(callback) {
  callback = callback || function() {
    return true;
  };

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

  var localConfig;

  try {
    localConfig = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY_CONFIG));
  }
  catch (e) {
    localConfig = null;
  }

  if (localConfig) {
    config = _.defaults(localConfig, config);
  }

  if (!config.server.url || !config.server.user || !config.server.password) {
    return callback(new Error('Missing server configuration'));
  }

  return callback(null);
}

function saveLocalStorage(callback) {
  callback = callback || function() {
    return true;
  };

  try {
    localStorage.setItem(LOCALSTORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (e) {
    return callback(new Error('Failed to save in local storage'))
  }

  return callback(null);
}

function clearLocalStorage(callback) {
  callback = callback || function() {
    return true;
  };

  localStorage.removeItem(LOCALSTORAGE_KEY_CONFIG);

  return callback(null);
}

function start(callback) {
  callback = callback || function() {
    return true;
  };

  loadConfiguration(function(err) {
    if (err) {
      showStartupModal();

      return callback(err);
    }

    render();

    return callback(null);
  });
}

start();
