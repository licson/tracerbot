var IP_ADDRESS = /^([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])$/;
var Telnet = require('../telnet');
var routers = {
	hkg: '218.188.104.6',
	tpe: '218.189.23.146',
	lon: '185.25.247.226',
	lax: '218.188.105.2',
	phx: '67.17.81.28'
};

var locations = {
	hkg: 'Hong Kong, HK',
	tpe: 'Taipei, TW',
	lon: 'London, UK',
	lax: 'Los Angeles, CA, US',
	phx: 'Phoenix, AZ, US'
};

var connect = function(router, cmd, callback){
	Telnet(routers[router], 23, [
		{ expect: '>', send: cmd + "\r\n" },
		{ expect: '>', out: callback, send: 'exit\r\n' }
	], function(e){
		if(e){
			console.log('lg.js: Error occured during connecting to %s', routers[router]);
		}
	});
};

module.exports = [
	{
		name: 'ping',
		desc: 'Performs an ICMP ping to the specified destination.',
		args: [
			{ name: 'router', required: true },
			{ name: 'target', required: true }
		],
		def: function(args, target){
			var router = args[0];
			var host = args[1];
			var self = this;

			if(router in routers){
				connect(router, 'ping ' + host, function(result){
					result = result.replace('Type escape sequence to abort.', '');
					result = result.replace('!!!!!', '');
					self.say(target, result);
				});
			}
			else {
				this.say(target, 'Wrong router identifier! Use -pops to get familiar with available router codes.');
			}
		}
	},
	{
		name: 'trace',
		desc: 'Performs a traceroute to the destination.',
		args: [
			{ name: 'router', required: true },
			{ name: 'target', required: true }
		],
		def: function(args, target){
			var router = args[0];
			var host = args[1];
			var self = this;

			if(router in routers){
				connect(router, 'traceroute ' + host, function(result){
					self.say(target, result);
				});
			}
			else {
				this.say(target, 'Wrong router identifier! Use -pops to get familiar with available router codes.');
			}
		}
	},
	{
		name: 'bgp',
		desc: 'Performs a routing table lookup.',
		args: [
			{ name: 'router', required: true },
			{ name: 'target', required: true }
		],
		def: function(args, target){
			var router = args[0];
			var host = args[1];
			var self = this;

			if(!IP_ADDRESS.test(host)){
				this.say(target, 'Only IP addresses can be specified for table lookup.');
				return;
			}

			if(router in routers){
				connect(router, 'show ip bgp ' + host, function(result){
					self.say(target, result);
				});
			}
			else {
				this.say(target, 'Wrong router identifier! Use -pops to get familiar with available router codes.');
			}
		}
	},
	{
		name: 'pops',
		desc: 'Shows information about the monitoring routers.',
		args: [],
		def: function(args, target){
			this.say(target, 'Available routers:');
			for(var i in locations){
				this.say(target, i + ' - ' + locations[i]);
			}
		}
	}
];