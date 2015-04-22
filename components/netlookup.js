var request = require('request');
var cheerio = require('cheerio');
var IP_ADDRESS = /^([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])$/;
var cache = {};

// Clear cache every hour
setInterval(function(){
	cache = {};
}, 3600000);

module.exports = [
	{
		name: 'iplookup',
		desc: 'Lookup information of a single IP address.',
		args: [
			{ name: 'ip', required: true }
		],
		def: function(args, target){
			var self = this;

			if(!IP_ADDRESS.test(args[0])){
				this.say(target, 'Please specify an IP address.');
				return;
			}

			request('http://ipinfo.io/' + args[0], function(e, res, body){
				if(!e && res.statusCode == 200){
					var info = JSON.parse(body);
					var output = '';

					// Show information of ISP
					output += 'ISP: ' + info.org;
					output += ' | Country: ' + info.country;

					if(info.city != null){
						output += ' | City: ' + info.city;
					}

					self.say(target, output);
				}
			});
		}
	},
	{
		name: 'asinfo',
		desc: 'Lookup detailed information of an Autonomous System (network).',
		args: [
			{ name: 'asnum', required: true }
		],
		def: function(args, target){
			var asnum = args[0].replace(/as\s*/i, '');

			if(asnum in cache){
				var result = cache[asnum];
				this.say(target, result);
				return;
			}
			else {
				var self = this;
				request({
					url: 'http://bgp.he.net/AS' + asnum,
					headers: {
						'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.18 Safari/537.36'
					}
				}, function(e, res, body){
					if(!e && res.statusCode == 200){
						var $ = cheerio.load(body);

						// Basic AS info
						cache[asnum] = '';
						cache[asnum] += $('h1').text() + '\r\n';
						cache[asnum] += $('.asinfotext').text().replace(/[\t]{1,}/g, '');

						self.say(target, cache[asnum]);
					}
				});
			}
		}
	}
];