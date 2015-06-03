var srg = require('../srg');

module.exports = {
	name: 'srg',
	desc: 'Generates a fake speedtest.net result image.',
	args: [
		{ name: 'dlspeed', required: true },
		{ name: 'ulspeed', required: true },
		{ name: 'ping', required: true },
		{ name: 'server', required: false }
	],
	def: function(args, target, from){
		var self = this;
		var dl = args[0];
		var ul = args[1];
		var ping = args[2];
		var server = args[3] || -1;

		srg.getResult({
			download: dl,
			upload: ul,
			ping: ping,
			server: server,
			noRandomize: true
		}, function(result){
			self.say(target, from + ': ' + result.resultImage);
		});
	}
};