'use strict';

var doT = require('dot');

/*
 * Templates
 */

exports.app = doT.template('' +
    '<nav class="navbar navbar-default" role="navigation">' +
    '    <div class="container-fluid">' +
    '        <div class="navbar-header">' +
    '            <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#navbar-collapse-1">' +
    '            <span class="sr-only">Toggle navigation</span>' +
    '            <span class="icon-bar"></span>' +
    '            <span class="icon-bar"></span>' +
    '            <span class="icon-bar"></span>' +
    '            </button>' +
    '            <a class="navbar-brand" href="#">zabbix-monitor</a>' +
    '        </div>' +
    '        <div id="menu">' +
    '        </div>' +
    '    </div>' +
    '</nav>' +
    '<main>' +
    '   <div id="view"></div>' +
    '</main>');

exports.menu = doT.template('' +
    '<div id="navbar-collapse-1" class="collapse navbar-collapse">' +
    '<ul class="nav navbar-nav navbar-left">' +
    '   <li{{? it.view === \'triggers\' }} class="active"{{?}}><a href="#triggers">Triggers</a></li>' +
    '   <li{{? it.view === \'events\' }} class="active"{{?}}><a href="#events">Events</a></li>' +
    '   <li{{? it.view === \'web\' }} class="active"{{?}}><a href="#web">Web</a></li>' +
    '</ul>' +
    '<ul class="nav navbar-nav navbar-right">' +
    '   <li><a href="#refresh"><span class="glyphicon glyphicon-refresh"></span></a></li>' +
    '   <li class="dropdown">' +
    '       <a href="#" class="dropdown-toggle" data-toggle="dropdown">Refresh <span class="caret"></span></a>' +
    '       <ul class="dropdown-menu" role="menu">' +
    '           <li{{? it.config.refresh === 0 }} class="active"{{?}}><a href="#refresh-0">Disable</a></li>' +
    '           <li{{? it.config.refresh === 30 }} class="active"{{?}}><a href="#refresh-30">Every 30s</a></li>' +
    '           <li{{? it.config.refresh === 60 }} class="active"{{?}}><a href="#refresh-60">Every 1m</a></li>' +
    '           <li{{? it.config.refresh === 300 }} class="active"{{?}}><a href="#refresh-300">Every 5m</a></li>' +
    '           <li{{? it.config.refresh === 900 }} class="active"{{?}}><a href="#refresh-900">Every 15m</a></li>' +
    '       </ul>' +
    '   </li>' +
    '   <li class="dropdown">' +
    '       <a href="#" class="dropdown-toggle" data-toggle="dropdown">Severity <span class="caret"></span></a>' +
    '       <ul class="dropdown-menu" role="menu">' +
    '           <li{{? it.config.severity === 0 }} class="active"{{?}}><a href="#severity-0">Not classified</a></li>' +
    '           <li{{? it.config.severity === 1 }} class="active"{{?}}><a href="#severity-1">Information</a></li>' +
    '           <li{{? it.config.severity === 2 }} class="active"{{?}}><a href="#severity-2">Warning</a></li>' +
    '           <li{{? it.config.severity === 3 }} class="active"{{?}}><a href="#severity-3">Average</a></li>' +
    '           <li{{? it.config.severity === 4 }} class="active"{{?}}><a href="#severity-4">High</a></li>' +
    '           <li{{? it.config.severity === 5 }} class="active"{{?}}><a href="#severity-5">Disaster</a></li>' +
    '       </ul>' +
    '   </li>' +
    '</ul>' +
    '</div>');

exports.viewTriggers = doT.template('' +
    '<section id="triggers" class="container-fluid">' +
    '   {{ for (var server in it.triggers) { }}' +
    '   <div class="triggers">' +
    '       <div class="triggers-header">' +
    '       </div>' +
    '       {{ for (var i = 0; i < it.triggers[server].length; i++) { }}' +
    '       <div id="trigger-data-{{= server }}-{{= it.triggers[server][i].triggerid }}" class="row triggers-row">' +
    '           <div class="col-xs-4 col-sm-2 col-md-2 col-lg-1 text-center">' +
    '               {{? it.triggers[server][i].value === "0" }}' +
    '               <span class="label trigger-status-ok">OK</span>' +
    '               {{??}}' +
    '               {{? it.triggers[server][i].priority === \'5\' }}' +
    '               <span class="label trigger-priority-disaster">DISASTER</span>' +
    '               {{?? it.triggers[server][i].priority === \'4\' }}' +
    '               <span class="label trigger-priority-high">HIGH</span>' +
    '               {{?? it.triggers[server][i].priority === \'3\' }}' +
    '               <span class="label trigger-priority-average">AVERAGE</span>' +
    '               {{?? it.triggers[server][i].priority === \'2\' }}' +
    '               <span class="label trigger-priority-warning">WARNING</span>' +
    '               {{?? it.triggers[server][i].priority === \'1\' }}' +
    '               <span class="label trigger-priority-information">INFORMATION</span>' +
    '               {{??}}' +
    '               <span class="label trigger-priority-notclassified">NOT CLASSIFIED</span>' +
    '               {{?}}' +
    '               {{?}}' +
    '           </div>' +
    '           <div class="col-xs-8 col-sm-2 col-md-2 col-lg-2">{{= it.triggers[server][i].host }}</div>' +
    '           <div class="hidden-xs col-sm-8 col-md-5 col-lg-7">{{= it.triggers[server][i].description }}</div>' +
    '           <div class="hidden-xs hidden-sm col-md-3 col-lg-2">{{= new Date(it.triggers[server][i].lastchange * 1000).toLocaleString() }}</div>' +
    '           </div>' +
    '           {{ } }}' +
    '       </div>' +
    '   </div>' +
    '   {{ } }}' +
    '</section>');

exports.viewEvents = doT.template('' +
    '<section id="events" class="container-fluid">' +
    '   {{ for (var server in it.events) { }}' +
    '   <div class="events">' +
    '       <div class="events-header">' +
    '       </div>' +
    '       {{ for (var i = 0; i < it.events[server].length; i++) { }}' +
    '       <div id="events-data-{{= server }}-{{= it.events[server][i].eventid }}" class="row events-row">' +
    '           <div class="col-xs-4 col-sm-2 col-md-2 col-lg-1 text-center">' +
    '               {{? it.events[server][i].value === "0" }}' +
    '               <span class="label event-status-ok">OK</span>' +
    '               {{??}}' +
    '               {{? it.events[server][i].relatedObject.priority === \'5\' }}' +
    '               <span class="label trigger-priority-disaster">DISASTER</span>' +
    '               {{?? it.events[server][i].relatedObject.priority === \'4\' }}' +
    '               <span class="label trigger-priority-high">HIGH</span>' +
    '               {{?? it.events[server][i].relatedObject.priority === \'3\' }}' +
    '               <span class="label trigger-priority-average">AVERAGE</span>' +
    '               {{?? it.events[server][i].relatedObject.priority === \'2\' }}' +
    '               <span class="label trigger-priority-warning">WARNING</span>' +
    '               {{?? it.events[server][i].relatedObject.priority === \'1\' }}' +
    '               <span class="label trigger-priority-information">INFORMATION</span>' +
    '               {{??}}' +
    '               <span class="label trigger-priority-notclassified">NOT CLASSIFIED</span>' +
    '               {{?}}' +
    '               {{?}}' +
    '           </div>' +
    '           <div class="col-xs-8 col-sm-2 col-md-2 col-lg-2">{{= it.events[server][i].hosts[0].host }}</div>' +
    '           <div class="hidden-xs col-sm-8 col-md-5 col-lg-7">{{= it.events[server][i].relatedObject.description }}</div>' +
    '           <div class="hidden-xs hidden-sm col-md-3 col-lg-2">{{= new Date(it.events[server][i].clock * 1000).toLocaleString() }}</div>' +
    '       </div>' +
    '       {{ } }}' +
    '   </div>' +
    '   {{ } }}' +
    '</section>');

exports.viewWeb = doT.template('' +
    '<section id="httptests" class="container-fluid">' +
    '   {{ for (var server in it.httptests) { }}' +
    '   <div class="httptests">' +
    '       <div class="httptest-header">' +
    '       </div>' +
    '       {{ for (var i = 0; i < it.httptests[server].length; i++) { }}' +
    '       <div id="httptest-data-{{= server }}-{{= it.httptests[server][i].hostid }}" class="row triggers-row">' +
    '           <div class="col-xs-4 col-sm-2 col-md-2 col-lg-1 text-center">' +
    '               {{? it.httptests[server][i].status === "0" }}' +
    '               <span class="label httptest-status-ok">OK</span>' +
    '               {{??}}' +
    '               <span class="label httptest-status-problem">PROBLEM</span>' +
    '               {{?}}' +
    '           </div>' +
    '           <div class="col-xs-8 col-sm-8 col-md-6 col-lg-7">{{= it.httptests[server][i].name }}</div>' +
    '           <div class="hidden-xs col-sm-2 col-md-2 col-lg-2">{{= it.httptests[server][i].hosts[0].host }}</div>' +
    '           <div class="hidden-xs hidden-sm col-md-2 col-lg-2">{{= new Date((it.httptests[server][i].nextcheck - it.httptests[server][i].delay) * 1000).toLocaleString() }}</div>' +
    '       </div>' +
    '       {{ } }}' +
    '      </div>' +
    '   </div>' +
    '   {{ } }}' +
    '</section>');
