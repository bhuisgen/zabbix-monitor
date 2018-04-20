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
  this.CONFIG_KEY = 'zabbix-monitor';
  this.config = null;
  this.timeoutId = null;
  this.zabbix = null;
  this.error = null;
  this.groups = {};
  this.hosts = {};
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

App.prototype.run = function(callback) {
  callback = callback || function() {
    return true;
  };

  var self = this;

  $('body').on('submit', '#formLogin', function(e) {
    e.preventDefault();

    var form = document.getElementById('formLogin');

    form.classList.add('was-validated');

    if (form.checkValidity() === false) {
      event.preventDefault();
      event.stopPropagation();

      return;
    }

    var server = {
      url: 'https://' + $('#formLogin').find('#zabbixServer').val() + '/api_jsonrpc.php',
      user: $('#formLogin').find('#zabbixUsername').val(),
      password: $('#formLogin').find('#zabbixPassword').val()
    };

    var test = new Zabbix(server.url, server.user, server.password);

    test.login(function(err) {
      if (err) {
        if (!err.message) {
          err.message = 'Unknown error';
        }

        return;
      }

      self.config.server.url = server.url;
      self.config.server.user = server.user;
      self.config.server.password = server.password;

      self.saveConfiguration($('#formLogin').find('#rememberMe').is(':checked'));

      self.zabbix = null;

      self.render();
    });
  });

  $('body').on('click', 'a[href="#presentation"]', function(e) {
    e.preventDefault();

    self.config.presentation = !self.config.presentation;

    self.refresh(true, true);
    self.saveConfiguration();
  });

  $('body').on('click', 'a[href="#fullscreen"]', function(e) {
    e.preventDefault();

    self.config.fullscreen = true;

    self.refresh(true, true);
    self.saveConfiguration();
  });

  $('html').keydown(function(eventData) {
    if (self.config.fullscreen && (eventData.keyCode === 27)) {
      self.config.fullscreen = false;

      self.refresh(true, true);
      self.saveConfiguration();
    }
  });

  $('body').on('click', 'a[href="#logout"]', function(e) {
    e.preventDefault();

    self.clearConfiguration(function(err) {
      self.run();
    });
  });

  $('body').on('click', '.sidebar-toggle', function(e) {
      $('.sidebar').toggleClass('toggled');

      self.config.sidebar = !$('.sidebar').hasClass('toggled');
      self.saveConfiguration();
  });

  $('body').on('click', 'a[href^="#view-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#view-(.+)/) || [''];
    if (m[1] != self.config.view) {
      self.config.view = m[1];

      self.refresh();
      self.saveConfiguration();
    }
  });

  $('body').on('click', 'a[href^="#triggers-status-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#triggers-status-(\d+)/) || [''];
    if (m[1]) {
      self.config.triggers.status = parseInt(m[1]);

      $('a[href^="#triggers-status-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh(true, true);
      self.saveConfiguration();
    }
  });

  $('body').on('click', 'a[href^="#triggers-severity-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#triggers-severity-(\d+)/) || [''];
    if (m[1]) {
      self.config.triggers.severity = parseInt(m[1]);

      $('a[href^="#triggers-severity-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh(true, true);
      self.saveConfiguration();
    }
  });

  $('body').on('click', 'a[href^="#triggers-age-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#triggers-age-(\d+)/) || [''];
    if (m[1]) {
      self.config.triggers.age = parseInt(m[1]);

      $('a[href^="#triggers-age-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh(true, true);
      self.saveConfiguration();
    }
  });

  $('body').on('click', 'a[href^="#triggers-sortfield-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#triggers-sortfield-(.+)/) || [''];
    if (m[1]) {
      self.config.triggers.sortField = m[1];

      $('a[href^="#triggers-sortfield-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh(true, true);
      self.saveConfiguration();
    }
  });

  $('body').on('click', 'a[href^="#triggers-sortorder-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#triggers-sortorder-(.+)/) || [''];
    if (m[1]) {
      self.config.triggers.sortOrder = m[1];

      $('a[href^="#triggers-sortorder-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh(true, true);
      self.saveConfiguration();
    }
  });

  $('body').on('click', 'a[href="#triggers-group"]', function(e) {
    e.preventDefault();

    delete self.config.triggers.groupids;

    self.refresh(true, true);
    self.saveConfiguration();
  });

  $('body').on('click', 'a[href^="#triggers-group-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#triggers-group-(\d+)/) || [''];
    if (m[1]) {
      self.config.triggers.groupids = m[1];

      self.refresh(true, true);
      self.saveConfiguration();
    }
  });

  $('body').on('click', 'a[href^="#events-period-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#events-period-(\d+)/) || [''];
    if (m[1]) {
      self.config.events.period = parseInt(m[1]);

      $('a[href^="#events-period-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh(true, true);
      self.saveConfiguration();
    }
  });

  $('body').on('click', 'a[href^="#events-sortfield-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#events-sortfield-(.+)/) || [''];
    if (m[1]) {
      self.config.events.sortField = m[1];

      $('a[href^="#events-sortfield-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh(true, true);
      self.saveConfiguration();
    }
  });

  $('body').on('click', 'a[href^="#events-sortorder-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#events-sortorder-(.+)/) || [''];
    if (m[1]) {
      self.config.events.sortOrder = m[1];

      $('a[href^="#events-sortorder-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh(true, true);
      self.saveConfiguration();
    }
  });

  $('body').on('click', 'a[href="#events-group"]', function(e) {
    e.preventDefault();

    delete self.config.events.groupids;

    self.refresh(true, true);
    self.saveConfiguration();
  });

  $('body').on('click', 'a[href^="#events-group-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#events-group-(\d+)/) || [''];
    if (m[1]) {
      self.config.events.groupids = m[1];

      self.refresh(true, true);
      self.saveConfiguration();
    }
  });

  $('body').on('click', 'a[href^="#httptests-sortfield-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#httptests-sortfield-(.+)/) || [''];
    if (m[1]) {
      self.config.httptests.sortField = m[1];

      $('a[href^="#httptests-sortfield-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh(true, true);
      self.saveConfiguration();
    }
  });

  $('body').on('click', 'a[href^="#httptests-sortorder-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#httptests-sortorder-(.+)/) || [''];
    if (m[1]) {
      self.config.httptests.sortOrder = m[1];

      $('a[href^="#httptests-sortorder-"]').parent().removeClass('active');
      $(this).parent().addClass('active');

      self.refresh(true, true);
      self.saveConfiguration();
    }
  });

  $('body').on('click', 'a[href="#httptests-group"]', function(e) {
    e.preventDefault();

    delete self.config.httptests.groupids;

    self.refresh(true, true);
    self.saveConfiguration();
  });

  $('body').on('click', 'a[href^="#httptests-group-"]', function(e) {
    e.preventDefault();

    var m = $(this).attr('href').match(/^#httptests-group-(\d+)/) || [''];
    if (m[1]) {
      self.config.httptests.groupids = m[1];

      self.refresh(true, true);
      self.saveConfiguration();
    }
  });

  this.loadConfiguration(function(err) {
    if (err) {
      self.showLogin();

      return callback(null);
    }

    self.render();

    return callback(null);
  });
};

App.prototype.render = function() {
  var self = this;

  $('#app').html(templates.app({
    config: this.config
  }));

  $('#sidebar').html(templates.sidebar({
    config: this.config
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

App.prototype.refresh = function(state, fast) {
  state = (typeof state === 'undefined' ? true : state);
  fast = (typeof full === 'undefined' ? false : fast);

  var self = this;

  if (this.timeoutId) {
    clearTimeout(this.timeoutId);
  }

  if (!state) {
    return;
  }

  if (!fast) {
    this.sidebar = !$('.sidebar').hasClass('toggled');

    $('#app').html(templates.app({
      config: this.config,
    }));

    $('#sidebar').html(templates.sidebar({
      config: this.config
    }));
  }

  if (this.error) {
    this.showErrorView();

    this.error = null;
    this.zabbix = null;
  } else {
    if (!this.zabbix) {
      this.render();

      return;
    }

    switch (this.config.view) {
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
      self.refresh(true, true);
    }, this.config.refresh * 1000);
  }
};

App.prototype.showLogin = function() {
  $('#app').html(templates.login({
    config: this.config
  }));
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
      self.refresh(true, true);

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

    if (self.config.view !== 'triggers') {
      return;
    }

    $('#view').html(templates.viewTriggers({
      moment: moment,
      config: self.config,
      groups: self.groups,
      hosts: self.hosts,
      triggers: self.triggers
    }));
  });
};

App.prototype.showEventsView = function() {
  var self = this;

  this.config.view = 'events';

  this.getEvents(this.zabbix, function(err, data) {
    if (err) {
      self.error = new Error('Failed to get events (' + err.message + ')');
      self.refresh(true, true);

      return;
    }

    self.events.data = data;
    self.events.alerts = {
      resolved: 0,
      problem: 0
    };

    for (var i = 0, j = self.events.data.length; i < j; i++) {
      if (self.events.data[i].value === '0') {
        self.events.alerts.resolved++;
      } else {
        self.events.alerts.problem++;
      }
    }

    if (self.config.view !== 'events') {
      return;
    }

    $('#view').html(templates.viewEvents({
      moment: moment,
      config: self.config,
      groups: self.groups,
      hosts: self.hosts,
      events: self.events
    }));
  });
};

App.prototype.showWebView = function() {
  var self = this;

  this.getHTTPTests(this.zabbix, function(err, data) {
    if (err) {
      self.error = new Error('Failed to get http tests (' + err.message + ')');
      self.refresh(true, true);

      return;
    }

    self.httptests.data = data;
    self.httptests.alerts = {
      ok: 0,
      problem: 0
    };

    for (var i = 0, j = self.httptests.data.length; i < j; i++) {
      if (self.httptests.data[i].lastvalue === '0') {
        self.httptests.alerts.ok++;
      } else {
        self.httptests.alerts.problem++;
      }
    }

    if (self.config.view !== 'web') {
      return;
    }

    $('#view').html(templates.viewWeb({
      moment: moment,
      config: self.config,
      groups: self.groups,
      hosts: self.hosts,
      httptests: self.httptests
    }));
  });
};

App.prototype.loadConfiguration = function(callback) {
  callback = callback || function() {
    return true;
  };

  var defaultConfig = {
    server: {},

    sidebar: false,
    presentation: false,
    fullscreen: false,
    view: this.DEFAULT_VIEW,
    refresh: 30,

    alerts: {
      enable: true,
      showOnlyProblems: false
    },

    triggers: {
      status: 1,
      severity: 2,
      age: 1,
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

  var localConfig = null;

  try {
    if (sessionStorage.getItem(this.CONFIG_KEY)) {
      localConfig = JSON.parse(sessionStorage.getItem(this.CONFIG_KEY));
    }
  }
  catch (e) {
    sessionStorage.removeItem(this.CONFIG_KEY);
  }

  if (localConfig == null) {
    try {
      if (localStorage.getItem(this.CONFIG_KEY)) {
        localConfig = JSON.parse(localStorage.getItem(this.CONFIG_KEY));
      }
    }
    catch (e) {
      localStorage.removeItem(this.CONFIG_KEY);
    }
  }

  this.config = _.defaultsDeep(localConfig, globalConfig, defaultConfig);

  if (!this.config.server.url || !this.config.server.user || !this.config.server.password) {
    return callback(new Error('Missing server configuration'));
  }

  return callback(null);
};

App.prototype.saveConfiguration = function(local, callback) {
  local = local || false;
  callback = callback || function() {
    return true;
  };

  try {
    if (local || localStorage.getItem(this.CONFIG_KEY)) {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    }
    else {
      sessionStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    }
  } catch (e) {
    return callback(new Error('Failed to save configuration'));
  }

  return callback(null);
};

App.prototype.clearConfiguration = function(callback) {
  callback = callback || function() {
    return true;
  };

  localStorage.removeItem(this.CONFIG_KEY);
  sessionStorage.removeItem(this.CONFIG_KEY);

  return callback(null);
};

App.prototype.connectToServer = function(callback) {
  callback = callback || function() {
    return true;
  };

  var zabbix = new Zabbix(this.config.server.url, this.config.server.user, this.config.server.password,
    this.config.server.options);

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

$(document).ready(function() {
  var app = new App();

  app.run();
});
