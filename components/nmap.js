var spawn = require('child_process').spawn;

// Some regular expressions for good
var IP_RANGES = /^([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\/([0-9]){0,3}$/;
var HOST_RANGES = /^(.*)(\/([0-9]){0,3})$/;

var rate_limit = [];

module.exports = {
	name: 'nmap',
	desc: 'Performs a port scan to the specified destination.',
	args: [
		{ name: 'target', required: true },
		{ name: 'options', required: false }
	],
	def: function(args, target, from){
		var self = this;

		if(rate_limit.indexOf(from) > -1){
			this.say(target, 'You can only execute this command every ' + this.opts.nmap.ratelimit_interval + ' second(s).');
			return;
		}

		this.checkAdmin(from, function(admin){
			if(!admin){
				rate_limit.push(from);
				setTimeout(function(){
					rate_limit.splice(rate_limit.indexOf(from), 1);
				}, this.opts.nmap.ratelimit_interval * 1000);
			}

			this.say(target, 'Please wait a while for nmap to finish its scan...');

			// Range scans can take a long time so it's good to disable it
			if(!this.opts.nmap.rangescan){
				for(var i = 0; i < args.length; i++){
					if(IP_RANGES.test(args[i]) == true || HOST_RANGES.test(args[i]) == true){
						this.say(target, 'nmap.js: IP range scan is disabled to prevent abuse.');
						return;
					}
				}
			}

			// Sometimes nmap don't work when the user don't have permissions
			// for raw sockets (or inside OpenVZ). To make it work, we need to
			// tell nmap not to use raw sockets or send Ethernet frames
			if(!this.opts.nmap.privileged){
				args = [ '--unprivileged' ].concat(args);
			}

			// Spawn nmap process
			var nmap = spawn('nmap', args);

			nmap.stdout.on('data', function(data){
				self.say(target, data);
			});

			nmap.stderr.on('data', function(data){
				self.say(target, data);
			});

			nmap.stdout.on('error', function(e){
				self.say(target, 'Error: ' + e.toString());
			});

			nmap.on('error', function(e){
				self.say(target, 'Error: ' + e.toString());
			});

			nmap.on('close', function(){
				console.log('nmap.js: Scan finished.');
			});
		});
	}
};