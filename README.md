# zabbix-monitor

A monitoring panel for Zabbix by Boris HUISGEN <bhuisgen@hbis.fr>

Under GNU GPL licence

## Building

	$ git clone https://github.com/bhuisgen/zabbix-monitor.git

	$ cd zabbix-monitor
	$ bower install
	$ npm install

## Configuration

	$ cp app/scripts/config.js.dist app/scripts/config.js
	$ vim app/config.js

## Running

This application is full client side and must be rebuilded after each configuration change :

	$ grunt build

You can now copy all files in the *dist/* directory into your web server directory and browse the web page *index.html*.

## Development

You can start a local web server with *grunt* :

	$ grunt serve

Each code change will rebuild the application.