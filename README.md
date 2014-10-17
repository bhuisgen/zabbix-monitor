# zabbix-monitor

A monitoring panel for Zabbix by Boris HUISGEN <bhuisgen@hbis.fr>

Under GNU GPL licence

## Features

* client-side application with responsive UI (desktop/tablet/mobile)
* show the current triggers
* show the last events
* show the status of web scenarios

## Building

    $ git clone https://github.com/bhuisgen/zabbix-monitor.git

    $ cd zabbix-monitor
    $ bower install
    $ npm install

## Configuration

Copy the configuration file template and edit the file:

    $ cp app/scripts/config.js.dist app/scripts/config.js
    $ vim app/config.js

Declare your Zabbix server and the user account which will be used to make API calls:

    servers: [{
        name: 'zabbix.my.domain',

        url: 'https://zabbix.my.domain/api_jsonrpc.php',
        user: 'zabbix-monitor',
        password: 'secret123',
    }]

## Running

This application is client side and must be rebuilded after each configuration change:

    $ grunt build

You can now copy all files in the *dist/* directory into your web server directory and browse the web page *index.html*.

## Development

You can start a local web server with *grunt* :

    $ grunt serve

Each code change will make a rebuild of the application.