'use strict';

var doT = require('dot');

/*
 * Templates
 */

exports.main = doT.template('' +
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
    '        <div class="collapse navbar-collapse" id="navbar-collapse-1">' +
    '           <ul class="nav navbar-nav navbar-left">' +
    '           <li><a href="#home">Home</a></li>' +
    '           <li><a href="#history">History</a></li>' +
    '           </ul>' +
    '           <ul class="nav navbar-nav navbar-right">' +
    '           <li><a href="#refresh"><span class="glyphicon glyphicon-refresh"></span></a></li>' +
    '           <li class="dropdown">' +
    '               <a href="#" class="dropdown-toggle" data-toggle="dropdown">Refresh <span class="caret"></span></a>' +
    '               <ul class="dropdown-menu" role="menu">' +
    '                   <li{{? it.config.refresh === 0 }} class="active"{{?}}><a href="#refresh-0">Disable</a></li>' +
    '                   <li{{? it.config.refresh === 30 }} class="active"{{?}}><a href="#refresh-30">Every 30s</a></li>' +
    '                   <li{{? it.config.refresh === 60 }} class="active"{{?}}><a href="#refresh-60">Every 1m</a></li>' +
    '                   <li{{? it.config.refresh === 300 }} class="active"{{?}}><a href="#refresh-300">Every 5m</a></li>' +
    '                   <li{{? it.config.refresh === 900 }} class="active"{{?}}><a href="#refresh-900">Every 15m</a></li>' +
    '               </ul>' +
    '           </li>' +
    '           <li class="dropdown">' +
    '               <a href="#" class="dropdown-toggle" data-toggle="dropdown">Severity <span class="caret"></span></a>' +
    '               <ul class="dropdown-menu" role="menu">' +
    '                   <li{{? it.config.severity === 0 }} class="active"{{?}}><a href="#severity-0">Not classified</a></li>' +
    '                   <li{{? it.config.severity === 1 }} class="active"{{?}}><a href="#severity-1">Information</a></li>' +
    '                   <li{{? it.config.severity === 2 }} class="active"{{?}}><a href="#severity-2">Warning</a></li>' +
    '                   <li{{? it.config.severity === 3 }} class="active"{{?}}><a href="#severity-3">Average</a></li>' +
    '                   <li{{? it.config.severity === 4 }} class="active"{{?}}><a href="#severity-4">High</a></li>' +
    '                   <li{{? it.config.severity === 5 }} class="active"{{?}}><a href="#severity-5">Disaster</a></li>' +
    '               </ul>' +
    '           </li>' +
    '           <li><a href="#" data-toggle="modal" data-target="settings"><span class="glyphicon glyphicon-cog"></span></a></li>' +
    '           </ul>' +
    '        </div>' +
    '    </div>' +
    '</nav>' +
    '<div class="modal fade" id="settings" tabindex="-1" role="dialog">' +
    '   <div class="modal-dialog">' +
    '       <div class="modal-content">' +
    '           <div class="modal-header">' +
    '               <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
    '               <h4 class="modal-title" id="myModalLabel">Modal title</h4>' +
    '           </div>' +
    '           <div class="modal-body">' +
    '           ...' +
    '           </div>' +
    '           <div class="modal-footer">' +
    '               <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
    '               <button type="button" class="btn btn-primary">Save changes</button>' +
    '           </div>' +
    '       </div>' +
    '   </div>' +
    '</div>' +
    '<main>' +
    '<div id="view"></div>' +
    '</main>');

exports.home = doT.template('' +
    '<section id="triggers" class="container-fluid">' +
    '   {{ for (var server in it.triggers) { }}' +
    '   <div class="panel panel-default">' +
    '       <div class="panel-heading">' +
    '           <div class="panel-title">{{=server}}</div>' +
    '       </div>' +
    '       <div class="panel-body">' +
    '           <div id="trigger-header-{{=server}}" class="row trigger-header">' +
    '               <div class="col-xs-2 col-sd-2 col-md-2 col-lg-2">Host</div>' +
    '               <div class="col-xs-9 col-sd-7 col-md-7 col-lg-7">Description</div>' +
    '               <div class="hidden-xs col-sd-2 col-md-2 col-lg-2">Last change</div>' +
    '           </div>' +
    '           {{ for (var i = 0; i < it.triggers[server].length; i++) { }}' +
    '           <div id="trigger-data-{{= server }}-{{= it.triggers[server][i].triggerid }}" class="row trigger-row trigger-priority-{{= it.triggers[server][i].priority }}">' +
    '               <div class="col-xs-2 col-sd-2 col-md-2 col-lg-2">{{= it.triggers[server][i].host }}</div>' +
    '               <div class="col-xs-9 col-sd-7 col-md-7 col-lg-7">{{= it.triggers[server][i].description }}</div>' +
    '               <div class="hidden-xs col-sd-2 col-md-2 col-lg-2">{{= new Date(it.triggers[server][i].lastchange * 1000).toUTCString() }}</div>' +
    '           </div>' +
    '           {{ } }}' +
    '       </div>' +
    '   </div>' +
    '   {{ } }}' +
    '</section>');

exports.history = doT.template('' +
    '<section id="triggers" class="container-fluid">' +
    '   {{ for (var server in it.triggers) { }}' +
    '   <div class="panel panel-default">' +
    '       <div class="panel-heading">' +
    '           <div class="panel-title">{{=server}}</div>' +
    '       </div>' +
    '       <div class="panel-body">' +
    '           <div id="trigger-header-{{=server}}" class="row trigger-header">' +
    '               <div class="col-xs-1 col-sd-1 col-md-1 col-lg-1">Status</div>' +
    '               <div class="col-xs-2 col-sd-2 col-md-2 col-lg-2">Host</div>' +
    '               <div class="col-xs-9 col-sd-7 col-md-7 col-lg-7">Description</div>' +
    '               <div class="hidden-xs col-sd-2 col-md-2 col-lg-2">Last change</div>' +
    '           </div>' +
    '           {{ for (var i = 0; i < it.triggers[server].length; i++) { }}' +
    '           <div id="trigger-data-{{=server}}-{{=it.triggers[server][i].triggerid}}" class="row trigger-row">' +
    '               <div class="col-xs-1 col-sd-1 col-md-1 col-lg-1">' +
    '                   {{? it.triggers[server][i].value === "0" }}' +
    '                   <span class="trigger-status-ok">OK</span>' +
    '                   {{??}}' +
    '                   <span class="trigger-status-problem">PROBLEM<span class="trigger-status-problem">' +
    '                   {{?}}' +
    '               </div>' +
    '               <div class="col-xs-2 col-sd-2 col-md-2 col-lg-2{{? it.triggers[server][i].value !== "0"}} trigger-priority-{{=it.triggers[server][i].priority}}{{?}}">{{=it.triggers[server][i].host}}</div>' +
    '               <div class="col-xs-9 col-sd-7 col-md-7 col-lg-7{{? it.triggers[server][i].value !== "0"}} trigger-priority-{{=it.triggers[server][i].priority}}{{?}}">{{=it.triggers[server][i].description}}</div>' +
    '               <div class="hidden-xs col-sd-2 col-md-2 col-lg-2{{? it.triggers[server][i].value !== "0"}} trigger-priority-{{=it.triggers[server][i].priority}}{{?}}">{{= new Date(it.triggers[server][i].lastchange * 1000).toUTCString()}}</div>' +
    '           </div>' +
    '           {{ } }}' +
    '       </div>' +
    '   </div>' +
    '   {{ } }}' +
    '</section>');