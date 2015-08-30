var fork = require('child_process').fork;
var jobs = {};

module.exports = {
	name: 'gravy',
	desc: 'Stress testing Minecraft Servers. Currently supports Minecraft 1.7.10 and non-Spigot servers.',
	args: [
		{ name: "host|stop", required: true },
		{ name: "port|id", required: false },
		{ name: "players", required: false }
	],
	def: function(args, target, from){
		var self = this;

		this.checkAdmin(from, function(admin){
			if(!admin){
				this.say(target, 'Only authorized users can execute this command.');
				return;
			}

			if(args[0] == 'stop'){
				if(args[1] in jobs){
					var proc = jobs[args[1]];
					proc.kill('SIGINT');
				}
				else {
					this.say(target, 'Invalid test ID.');
				}
			}
			else {
				var host = args[0];
				var port = args[1] || this.opts.gravy.port;
				var players = args[2] || this.opts.gravy.players;
				var id = Math.floor(Math.random() * 0xffffffff).toString(16);
				var proc = fork(__dirname + '/../modules/gravy_child.js');

				proc.on('exit', function(){
					delete jobs[id];
					self.say(target, 'Test #' + id + ' has stopped.');
				});

				proc.send({
					host: host,
					port: port,
					players: players
				});

				jobs[id] = proc;

				this.say(target, 'Test #' + id + ' initiated. Use -gravy stop <id> to stop the test.');
			}
		});
	}
}