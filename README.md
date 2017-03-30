# zabbix-monitor

A monitoring panel for Zabbix by Boris HUISGEN <bhuisgen@hbis.fr>

Under GNU GPL licence

## Features

* client-side application with responsive UI (desktop/tablet/mobile)
* show the current triggers
* show the last events
* show the status of web scenarios

## Building

Clone the project:

    $ git clone https://github.com/bhuisgen/zabbix-monitor.git
    $ cd zabbix-monitor

Copy the configuration file template and edit the file:

    $ cp app/scripts/config.js.dist app/scripts/config.js
    $ vim app/scripts/config.js

**Optional**: you can declare your Zabbix API server like this:

    server: {
        name: 'zabbix.my.domain',

        url: 'https://zabbix.my.domain/api_jsonrpc.php',
        user: 'zabbix-monitor',
        password: 'secret123'
    }

If no server is found in the configuration file, *zabbix-monitor* will show you a startup modal to declare it.

Install the package dependencies and run the build:

    $ npm install
    $ grunt build

You can now copy all files in the *dist/* directory into your web server directory and browse the web page *index.html*.
