'use strict';

var _ = require('lodash');
var async = require('async');
var moment = require('moment');
var doT = require('dot');
var Zabbix = require('./zabbix');

var globalConfig;

try {
  globalConfig = require('./config');
} catch (ex) {
  globalConfig = {};
}

var templates = require('./templates');

var App = function() {
  this.DEFAULT_VIEW = 'triggers';
  this.LOCALSTORAGE_KEY_CONFIG = 'zabbix-monitor.config';
  this.config = null;
  this.zabbix = null;
  this.groups = {};
  this.hosts = {};
  this.view = this.DEFAULT_VIEW;
  this.fullscreen = false;
  this.timeoutId = null;
  this.error = null;
  this.triggers = {
    data: null,
    alerts: null
  };
  this.events = {
    data: null,
    alerts: null
  };
  this.httptests = {
    data: null,
    alerts: null
  };
};

App.prototype.loadConfiguration = function(callback) {
  callback = callback || function() {
    return true;
  };

  var defaultConfig = {
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
      sortOrder: 'ASC',
      selectInMaintenance: false,
      selectWithUnacknowledgedEvents: false,
      selectWithAcknowledgedEvents: false,
      selectWithLastEventUnacknowledged: true,
      selectSkipDependent: true,
      selectMinimalSeverity: 0
    },

    events: {
      period: 1,
      sortField: 'clock',
      sortOrder: 'DESC'
    },

    httptests: {
      sortField: 'name',
      sortOrder: 'ASC'
    }
  };

  var localConfig;

  try {
    localConfig = JSON.parse(localStorage.getItem(this.LOCALSTORAGE_KEY_CONFIG));
  }
  catch (e) {
    localConfig = null;
  }

  this.config = _.defaultsDeep(localConfig, globalConfig, defaultConfig);

  if (!this.config.server.url || !this.config.server.user || !this.config.server.password) {
    return callback(new Error('Missing server configuration'));
  }

  return callback(null);
};

App.prototype.saveLocalStorage = function(callback) {
  callback = callback || function() {
    return true;
  };

  try {
    localStorage.setItem(this.LOCALSTORAGE_KEY_CONFIG, JSON.stringify(this.config));
  } catch (e) {
    return callback(new Error('Failed to save in local storage'));
  }

  return callback(null);
};

App.prototype.clearLocalStorage = function(callback) {
  callback = callback || function() {
    return true;
  };

  localStorage.removeItem(this.LOCALSTORAGE_KEY_CONFIG);

  return callback(null);
};

App.prototype.run = function(callback) {
  callback = callback || function() {
    return true;
  };

  var self = this;

  $('body').on('click', '#modalStartup #startupConnect', function(e) {
    var form = document.getElementById('formStartup');

    form.classList.add('was-validated');

    if (form.checkValidity() === false) {
      event.preventDefault();
      event.stopPropagation();

      return;
    }

    var server = {
      url:'https://' + $('#modalStartup').find('#serverHostname').val() + '/api_jsonrpc.php',
      user: $('#modalStartup').find('#serverUser').val(),
      password: $('#modalStartup').find('#serverPassword').val()
    };

    var test = new Zabbix(server.url, server.user, server.password);

    test.login(function(err) {
      if (err) {
        if (!err.message) {
          err.message = 'Unknown error';
        }

        event.preventDefault();
        event.stopPropagation();

        return;
      }

      self.config.server.url = server.url;
      self.config.server.user = server.user;
      self.config.server.password = server.password;

      if ($('#modalStartup').find('#rememberMe').is(':checked')) {
        self.saveLocalStorage();
      } else {
        self.clearLocalStorage();
      }

      self.zabbix = null;

      $('#modalStartup').modal('hide');
    });
  });

  $('body').on('hide.bs.modal','#modalStartup', function() {
    self.refresh();
  });

  $('body').on('click', 'a[href^="#view-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#view-(.+)/) || [''];
    if (m[1]) {
      self.view = m[1];

      self.refresh();
    }
  });

  $('body').on('click', 'a[href="#settings"]', function(e) {
    e.preventDefault();

    self.showSettingsModal();
  });

  $('body').on('keyup', '#modalSettings', function(e) {
    e.preventDefault();

    $('#modalSettings').find('#settingsTestSuccess').hide();
    $('#modalSettings').find('#settingsTestFailed').hide();
    $('#modalSettings').find('#settingsTest').closest('div').removeClass('has-error', 'has-success');
  });

  $('body').on('click', '#modalSettings #settingsTest', function(e) {
    var form = document.getElementById('formSettings');

    form.classList.add('was-validated');

    if (form.checkValidity() === false) {
      event.preventDefault();
      event.stopPropagation();

      return;
    }

    var server = {
      url: $('#modalSettings').find('#serverURL').val(),
      user: $('#modalSettings').find('#serverUser').val(),
      password: $('#modalSettings').find('#serverPassword').val()
    };

    $('#modalSettings').find('#settingsTestMessage').text('');
    $('#modalSettings').find('#settingsTestMessage').removeClass('text-danger text-success');

    if (!server.url || !server.user || !server.password) {
      return;
    }

    var test = new Zabbix(server.url, server.user, server.password);

    test.login(function(err) {
      if (err) {
        if (!err.message) {
          err.message = 'Unknown error';
        }

        $('#modalSettings').find('#settingsTestMessage').val(err.message);
        $('#modalSettings').find('#settingsTestMessage').addClass('text-danger').removeClass('text-success');

        return;
      }

      $('#modalSettings').find('#settingsTestMessage').val('Succesfully connected');
      $('#modalSettings').find('#settingsTestMessage').addClass('text-success').removeClass('text-danger');
    });
  });

  $('body').on('click', '#settingsSave', function(e) {
    var form = document.getElementById('formSettings');

    form.classList.add('was-validated');

    if (form.checkValidity() === false) {
      event.preventDefault();
      event.stopPropagation();

      return;
    }

    var server = {
      url: $('#modalSettings').find('#serverURL').val(),
      user: $('#modalSettings').find('#serverUser').val(),
      password: $('#modalSettings').find('#serverPassword').val()
    };

    self.config.server.url = server.url;
    self.config.server.user = server.user;
    self.config.server.password = server.password;

    if ($('#modalSettings').find('#storeConfiguration').is(':checked')) {
      self.saveLocalStorage();
    } else {
      self.clearLocalStorage();
    }

    self.zabbix = null;

    $('#modalSettings').modal('hide');
  });

  $('body').on('hide.bs.modal','#modalSettings', function() {
    self.refresh();
  });

  $('body').on('click', 'a[href="#fullscreen"]', function(e) {
    e.preventDefault();

    self.fullscreen = true;

    self.refresh();

    $('#fullscreen-alert').append(
      '<div class="alert alert-dark alert-dismissible fade show" role="alert">' +
      'Press [ESC] key or reload this page to quit the fullscreen mode.' +
      '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
      '<span aria-hidden="true">&times;</span>' +
      '</button>' +
      '</div>');
  });

  document.onkeydown = function(evt) {
    evt = evt || window.event;

    if (evt.keyCode == 27) {
      self.fullscreen = false;

      self.refresh();
    }
  };

  $('body').on('click', 'a[href="#refresh"]', function(e) {
    e.preventDefault();

    self.refresh();
  });

  $('body').on('click', 'a[href^="#refresh-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#refresh-(\d+)/) || [''];
    if (m[1]) {
      self.config.refresh = parseInt(m[1]);

      self.refresh();
    }
  });

  $('body').on('click', 'a[href^="#triggers-status-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#triggers-status-(\d+)/) || [''];
    if (m[1]) {
      self.config.triggers.status = parseInt(m[1]);

      $('a[href^="#triggers-status-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh();
    }
  });

  $('body').on('click', 'a[href^="#triggers-severity-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#triggers-severity-(\d+)/) || [''];
    if (m[1]) {
      self.config.triggers.severity = parseInt(m[1]);

      $('a[href^="#triggers-severity-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh();
    }
  });

  $('body').on('click', 'a[href^="#triggers-age-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#triggers-age-(\d+)/) || [''];
    if (m[1]) {
      self.config.triggers.age = parseInt(m[1]);

      $('a[href^="#triggers-age-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh();
    }
  });

  $('body').on('click', 'a[href^="#triggers-sortfield-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#triggers-sortfield-(.+)/) || [''];
    if (m[1]) {
      self.config.triggers.sortField = m[1];

      $('a[href^="#triggers-sortfield-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh();
    }
  });

  $('body').on('click', 'a[href^="#triggers-sortorder-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#triggers-sortorder-(.+)/) || [''];
    if (m[1]) {
      self.config.triggers.sortOrder = m[1];

      $('a[href^="#triggers-sortorder-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh();
    }
  });

  $('body').on('click', 'a[href="#triggers-group"]', function(e) {
    e.preventDefault();

    delete self.config.triggers.groupids;

    self.refresh();
  });

  $('body').on('click', 'a[href^="#triggers-group-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#triggers-group-(\d+)/) || [''];
    if (m[1]) {
      self.config.triggers.groupids = m[1];

      self.refresh();
    }
  });

  $('body').on('click', 'a[href^="#events-period-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#events-period-(\d+)/) || [''];
    if (m[1]) {
      self.config.events.period = parseInt(m[1]);

      $('a[href^="#events-period-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh();
    }
  });

  $('body').on('click', 'a[href^="#events-sortfield-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#events-sortfield-(.+)/) || [''];
    if (m[1]) {
      self.config.events.sortField = m[1];

      $('a[href^="#events-sortfield-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh();
    }
  });

  $('body').on('click', 'a[href^="#events-sortorder-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#events-sortorder-(.+)/) || [''];
    if (m[1]) {
      self.config.events.sortOrder = m[1];

      $('a[href^="#events-sortorder-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh();
    }
  });

  $('body').on('click', 'a[href="#events-group"]', function(e) {
    e.preventDefault();

    delete self.config.events.groupids;

    self.refresh();
  });

  $('body').on('click', 'a[href^="#events-group-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#events-group-(\d+)/) || [''];
    if (m[1]) {
      self.config.events.groupids = m[1];

      self.refresh();
    }
  });

  $('body').on('click', 'a[href^="#httptests-sortfield-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#httptests-sortfield-(.+)/) || [''];
    if (m[1]) {
      self.config.httptests.sortField = m[1];

      $('a[href^="#httptests-sortfield-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh();
    }
  });

  $('body').on('click', 'a[href^="#httptests-sortorder-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#httptests-sortorder-(.+)/) || [''];
    if (m[1]) {
      self.config.httptests.sortOrder = m[1];

      $('a[href^="#httptests-sortorder-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh();
    }
  });

  $('body').on('click', 'a[href="#httptests-group"]', function(e) {
    e.preventDefault();

    delete self.config.httptests.groupids;

    self.refresh();
  });

  $('body').on('click', 'a[href^="#httptests-group-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#httptests-group-(\d+)/) || [''];
    if (m[1]) {
      self.config.httptests.groupids = m[1];

      self.refresh();
    }
  });

  this.loadConfiguration(function(err) {
    if (err) {
      self.showStartupModal();

      return callback(err);
    }

    self.render();

    return callback(null);
  });
};

App.prototype.render = function() {
  var self = this;

  $('#app').html(templates.app);

  $('#menu').html(templates.menu({
    config: this.config,
    view: this.view,
    fullscreen: this.fullscreen
  }));

  this.connectToServer(function(err, data) {
    if (err) {
      self.error = new Error('Failed to connect to API (' + err.message + ')');
      self.refresh();

      return;
    }

    self.zabbix = data;

    self.refresh();

    self.getHostGroups(self.zabbix, function(err, data) {
      if (err) {
        self.error = new Error('Failed to get hostgroups (' + err.message + ')');
        self.refresh();

        return;
      }

      self.groups = data;

      self.refresh();
    });

    self.getHosts(self.zabbix, function(err, data) {
      if (err) {
        self.error = new Error('Failed to get hosts (' + err.message + ')');
        self.refresh();

        return;
      }

      self.hosts = data;

      self.refresh();
    });
  });
};

App.prototype.refresh = function(state) {
  state = (typeof state === 'undefined' ? true : state);

  var self = this;

  if (this.timeoutId) {
    clearTimeout(this.timeoutId);
  }

  if (!state) {
    return;
  }

  $('#menu').html(templates.menu({
    config: this.config,
    view: this.view,
    fullscreen: this.fullscreen
  }));

  if (this.error) {
    this.showErrorView();

    this.error = null;
    this.zabbix = null;
  } else {
    if (!this.zabbix) {
      this.render();

      return;
    }

    switch (this.view) {
      case 'triggers':
        this.showTriggersView();
        break;

      case 'events':
        this.showEventsView();
        break;

      case 'web':
        this.showWebView();
        break;

      default:
        break;
    }
  }

  if (this.config.refresh > 0) {
    this.timeoutId = setTimeout(function() {
      self.refresh();
    }, this.config.refresh * 1000);
  }
};

App.prototype.showStartupModal = function() {
  $('#app').html(templates.app({
    config: this.config,
    view: this.view
  }));

  $('#modal').html(templates.modalStartup({
    config: this.config
  }));

  $('#modalStartup').modal({
    backdrop: 'static',
    keyboard: false
  });
};

App.prototype.showSettingsModal = function() {
  this.refresh(false);

  $('#modal').html(templates.modalSettings({
    config: this.config
  }));

  $('#modalSettings').modal();
};

App.prototype.showErrorView = function() {
  $('#view').html(templates.viewError({
    config: this.config,
    error: this.error
  }));
};

App.prototype.showTriggersView = function() {
  var self = this;

  this.getTriggers(this.zabbix, function(err, data) {
    if (err) {
      self.error = new Error('Failed to get triggers (' + err.message + ')');
      self.refresh();

      return;
    }

    if (self.view !== 'triggers') {
      return;
    }

    self.triggers.data = data;
    self.triggers.alerts = {
      ok: 0,
      disaster: 0,
      high: 0,
      average: 0,
      warning: 0,
      information: 0,
      notclassified: 0
    };

    for (var i = 0, j = self.triggers.data.length; i < j; i++) {
      if (self.triggers.data[i].value === '0') {
        self.triggers.alerts.ok++;

        continue;
      }

      switch (self.triggers.data[i].priority) {
        case '5':
          self.triggers.alerts.disaster++;
          break;

        case '4':
          self.triggers.alerts.high++;
          break;

        case '3':
          self.triggers.alerts.average++;
          break;

        case '2':
          self.triggers.alerts.warning++;
          break;

        case '1':
          self.triggers.alerts.information++;
          break;

        case '0':
          self.triggers.alerts.notclassified++;
          break;
      }
    }

    $('#view').html(templates.viewTriggers({
      moment: moment,
      config: self.config,
      groups: self.groups,
      hosts: self.hosts,
      triggers: self.triggers,
      fullscreen: self.fullscreen
    }));
  });
};

App.prototype.showEventsView = function() {
  var self = this;

  this.view = 'events';

  this.getEvents(this.zabbix, function(err, data) {
    if (err) {
      self.error = new Error('Failed to get events (' + err.message + ')');
      self.refresh();

      return;
    }

    if (self.view !== 'events') {
      return;
    }

    self.events.data = data;

    $('#view').html(templates.viewEvents({
      moment: moment,
      config: self.config,
      groups: self.groups,
      hosts: self.hosts,
      events: self.events,
      fullscreen: self.fullscreen
    }));
  });
};

App.prototype.showWebView = function() {
  var self = this;

  this.getHTTPTests(this.zabbix, function(err, data) {
    if (err) {
      self.error = new Error('Failed to get http tests (' + err.message + ')');
      self.refresh();

      return;
    }

    if (self.view !== 'web') {
      return;
    }

    self.httptests.data = data;
    self.httptests.alerts = 0;

    for (var i = 0, j = self.httptests.data.length; i < j; i++) {
      if (self.httptests.data[i].lastvalue !== '0') {
        self.httptests.alerts++;
      }
    }

    $('#view').html(templates.viewWeb({
      config: self.config,
      groups: self.groups,
      hosts: self.hosts,
      httptests: self.httptests,
      fullscreen: self.fullscreen
    }));
  });
};

App.prototype.connectToServer = function(callback) {
  callback = callback || function() {
    return true;
  };

  var zabbix = new Zabbix(this.config.server.url, this.config.server.user, this.config.server.password, this.config.server.options);

  zabbix.login(function(err) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, zabbix);
  });
};

App.prototype.getHostGroups = function(zabbix, callback) {
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
};

App.prototype.getHosts = function(zabbix, callback) {
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
};

App.prototype.getTriggers = function(zabbix, callback) {
  callback = callback || function() {
    return true;
  };

  var params = {
    output: ['triggerid', 'description', 'expression', 'lastchange', 'priority', 'value'],
    expandDescription: 1,
    selectHosts: 'extend',
    monitored: 1,
    min_severity: this.config.triggers.severity
  };

  if (this.config.triggers.groupids) {
    params.groupids = this.config.triggers.groupids;
  }

  if (this.config.triggers.hostids) {
    params.hostids = this.config.triggers.hostids;
  }

  if (this.config.triggers.status === 1) {
    params.only_true = 1;
  } else if (this.config.triggers.status === 2) {
    params.filter = {
      value: 1
    };
  }

  if (this.config.triggers.sortField) {
    params.sortfield = this.config.triggers.sortField;
  }

  if (this.config.triggers.sortOrder) {
    params.sortorder = this.config.triggers.sortOrder;
  }

  if (this.config.triggers.age) {
    params.lastChangeSince = moment().subtract(this.config.triggers.age, 'days').unix();
  }

  if (this.config.triggers.selectInMaintenance) {
    params.maintenance = true;
  }

  if (this.config.triggers.selectWithUnacknowledgedEvents) {
    params.withUnacknowledgedEvents = 1;
  }

  if (this.config.triggers.selectWithAcknowledgedEvents) {
    params.withAcknowledgedEvents = 1;
  }

  if (this.config.triggers.selectWithLastEventUnacknowledged) {
    params.withLastEventUnacknowledged = 1;
  }

  if (this.config.triggers.selectWithLastEventUnacknowledged) {
    params.withLastEventUnacknowledged = 1;
  }

  if (this.config.triggers.selectSkipDependent) {
    params.skipDependent = 1;
  }

  if (this.config.triggers.lastChangeSince) {
    params.lastChangeSince = this.config.triggers.lastChangeSince;
  }

  if (this.config.triggers.limit) {
    params.limit = this.config.triggers.limit;
  }

  zabbix.send('trigger.get', params, function(err, data) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, data.result);
  });
};

App.prototype.getEvents = function(zabbix, callback) {
  callback = callback || function() {
    return true;
  };

  var params = {
    output: ['eventid', 'acknowledged', 'clock', 'object', 'source', 'value'],
    expandDescription: 1,
    selectHosts: 'extend',
    selectRelatedObject: 'extend'
  };

  if (this.config.events.groupids) {
    params.groupids = this.config.events.groupids;
  }

  if (this.config.events.hostids) {
    params.hostids = this.config.events.hostids;
  }

  if (this.config.events.period) {
    params.time_from = moment().subtract(this.config.events.period, 'hours').unix();
  }

  if (this.config.events.sortField) {
    params.sortfield = this.config.events.sortField;
  }

  if (this.config.events.sortOrder) {
    params.sortorder = this.config.events.sortOrder;
  }

  zabbix.send('event.get', params, function(err, data) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, data.result);
  });
};

App.prototype.getHTTPTests = function(zabbix, callback) {
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

  if (this.config.httptests.groupids) {
    params.groupids = this.config.httptests.groupids;
  }

  if (this.config.httptests.hostids) {
    params.hostids = this.config.httptests.hostids;
  }

  if (this.config.httptests.sortField) {
    params.sortfield = this.config.httptests.sortField;
  }

  if (this.config.httptests.sortOrder) {
    params.sortorder = this.config.httptests.sortOrder;
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
};

var app = new App();

app.run();
