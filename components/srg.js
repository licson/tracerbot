var request = require('request');
var fs = require('fs');
var tempDir = require('os').tmpdir();
var srg = require('../modules/srg');

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
		var dl = parseInt(args[0]);
		var ul = parseInt(args[1]);
		var ping = parseInt(args[2]);
		var server = parseInt(args[3]) || -1;

		srg.getResult({
			download: dl,
			upload: ul,
			ping: ping,
			server: server,
			noRandomize: true
		}, function(result){
			if(self.tg){
				var x = fs.createWriteStream(tempDir + '/speedtest.png');
				x.on('finish', function(){
					self.tg.sendPhoto(target, tempDir + '/speedtest.png');
				});
				
				request(result.resultImage).pipe(x);
			}
			else {
				self.say(from + ': ' + result.resultImage);
				self.send();
			}
		});
	}
};