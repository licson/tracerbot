var request = require('request');
var cheerio = require('cheerio');
var IP_ADDRESS = /^([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])$/;
var IP6_ADDRESS = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/;
var cache = {};

// Clear cache every hour
setInterval(function(){
	cache = {};
}, 3600000);

module.exports = [
	{
		name: 'ipinfo',
		desc: 'Lookup information of a single IP address.',
		args: [
			{ name: 'ip', required: true }
		],
		def: function(args, target){
			var self = this;

			if(!IP_ADDRESS.test(args[0]) && !IP6_ADDRESS.test(args[0])){
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
					
					if(info.region != null){
						output += ' | Region: ' + info.region;
					}
					
					if(info.hosting){
						output += '\nThis IP belongs to a hosting company.';
					}
					
					if(info.carrier){
						output += '\nThis IP belongs to a mobile carrier named "' + info.carrier + '"';
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
				if('basic' in cache[asnum]){
					var result = cache[asnum]['basic'];
					this.say(target, result);
					return;
				}
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
						cache[asnum] = {};
						cache[asnum]['basic'] = '';
						cache[asnum]['basic'] += $('h1').text() + '\r\n';
						cache[asnum]['basic'] += $('.asinfotext').text().replace(/[\t]{1,}/g, '');

						self.say(target, cache[asnum]['basic']);
					}
				});
			}
		}
	}, 
	{
		name: 'aspeer',
		desc: 'Get a list of connected networks of an Autonomous System (network).',
		args: [
			{ name: 'asnum', required: true }
		],
		def: function(args, target){
			var asnum = args[0].replace(/as\s*/i, '');

			if(asnum in cache){
				if('peers' in cache[asnum]){
					var result = cache[asnum]['peers'];
					this.say(target, result);
					return;
				}
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
						var exceed = false;
						var str = '';

						$('#table_peers4 tbody tr').each(function(i){
							if(i >= self.opts.aspeer.numresult){
								exceed = true;
								return;
							}

							var as = $(this).find('td').eq(3).text();
							var name = $(this).find('td').eq(1).text();
							str += (as + ' ' + name + '\r\n');
						});

						// AS Peers
						cache[asnum] = {};
						cache[asnum]['peers'] = $('h1').text() + ' IPv4 Peers list:\r\n';
						cache[asnum]['peers'] += str;

						if(exceed){
							cache[asnum]['peers'] += "\r\n(" + ($('#table_peers4 tbody tr').length - self.opts.aspeer.numresult) + " more records)";
						}

						self.say(target, cache[asnum]['peers']);
					}
				});
			}
		}
	}
];