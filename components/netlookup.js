var request = require('request');
var cheerio = require('cheerio');
var whois = require('whois');
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

			request({
				url: 'http://ipinfo.io/' + args[0],
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.18 Safari/537.36'
				}
			}, function(e, res, body){
				if(!e && res.statusCode == 200){
					var $ = cheerio.load(body);
					var txt_info = $('pre.example-results-basic').text();
					
					var info = JSON.parse(txt_info);
					var output = '';

					// Show information of ISP
					output += 'ISP: ' + (info.org || 'unknown');
					output += ' | Country: ' + info.country;

					if(info.city != null){
						output += ' | City: ' + info.city;
					}
					
					if(info.region != ""){
						output += ' | Region: ' + info.region;
					}
					
					if(info.hosting){
						output += '\nThis IP belongs to a hosting company.';
					}
					
					if(info.carrier){
						output += '\nThis IP belongs to a mobile carrier named "' + info.carrier + '"';
					}

					if(info.bogon){
						output += '\nThis IP is a bogon / private IP that should not appear in public internet.'
					}

					self.say(target, output);
				}
			});
		}
	},
	{
		name: 'whois',
		desc: 'Lookup domain registration information.',
		args: [
			{ name: 'domain', required: true }
		],
		def: function(args, target){
			var self = this;
			whois.lookup(args[0], { follow: 4 }, function(e, record){
				if(e){
					self.say("Error when connecting to WHOIS server.");
				}
				else {
					self.say(target, record);
				}
			});
		}
	}
];