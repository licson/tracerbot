'use strict';

var spawn = require('child_process').spawn;
var rate_limit = [];

module.exports = {
	name: 'curl',
	desc: 'Fetch resources over HTTP(s)/FTP.',
	args: [
		{ name: 'url', required: true },
		{ name: 'options', required: false }
	],
	def: function(args, target, from){
		var self = this;

		if(rate_limit.indexOf(from) > -1){
			this.say(target, 'You can only execute this command every ' + this.getOption('opts.curl.ratelimit_interval') +
					' second(s).');
			return;
		}

		this.checkAdmin(from, function(admin){
			if(!admin){
				rate_limit.push(from);
				setTimeout(function(){
					rate_limit.splice(rate_limit.indexOf(from), 1);
				}, this.getOption('options.curl.ratelimit_interval') * 1000);
			}

			var curl = spawn('curl', args);

			curl.stdout.on('data', function(data){
				self.say(data);
			});

			curl.stdout.on('finish', function () {
				self.send();
			});

			curl.stdout.on('error', function(e){
				self.say('curl.js Error: ' + e.toString());
			});

			curl.on('error', function(e){
				self.say('curl.js Error: ' + e.toString());
			});
		});
	}
};