var fs = require('fs');

module.exports = [
	{
		name: 'admin',
		desc: 'Performs administrative operations.',
		args: [
			{ name: 'action', required: true },
			{ name: 'options', required: false }
		],
		def: function(args, target, from){
			this.checkAdmin(from, function(admin){
				if(!admin){
					this.say(target, 'Only authorized person can perform this action.');
					return;
				}

				switch(args[0]){
					case "op":
					if(this.admins.indexOf(args[1]) < 0){
						this.admins.push(args[1]);
						this.say(target, 'Successfully added ' + args[1] + ' as an operator.');
					}
					else {
						this.say(target, 'User ' + args[1] + ' is already an operator.');
					}
					break;

					case "deop":
					this.admins.indexOf(args[1]) > -1 && this.admins.splice(this.admins.indexOf(args[1]), 1);
					this.say(target, 'User ' + args[1] + ' is no longer an operator.');
					break;

					case "ban":
					var cmd = args[1];
					var user = args[2];

					if(!cmd || !user){
						this.say(target, 'Please specify the user and command to be banned.');
						return;
					}

					if(Array.isArray(this.banlist[cmd])){
						this.banlist[cmd].push(user);
					}
					else {
						this.banlist[cmd] = [];
						this.banlist[cmd].push(user);
					}
					this.say(target, 'Banned ' + user + ' from executing ' + cmd + '!');
					break;

					case "unban":
					var cmd = args[1];
					var user = args[2];

					if(!cmd || !user){
						this.say(target, 'Please specify the user and command to be banned.');
						return;
					}

					if(this.banlist[cmd].indexOf(user) > -1){
						this.banlist[cmd].splice(this.banlist[cmd].indexOf(user), 1);
					}

					this.say(target, 'Unbanned ' + user + ' from executing ' + cmd + '!');
					break;
				}
			});
		}
	},
	{
		name: 'reload',
		desc: 'Reload the configuration file.',
		args: [],
		def: function(args, target){
			var self = this;
			fs.readFile(__dirname + '/../options.json', function(e, data){
				if(!e){
					self.opts = JSON.parse(data.toString());
					self.say(target, 'Reload complete.');
				}
			});
		}
	},
	{
		name: 'join',
		desc: 'Join another channel.',
		args: [
			{ name: 'channel', required: true }
		],
		def: function(args, target, from){
			this.checkAdmin(from, function(admin){
				if(!admin){
					this.say(target, 'Only authorized person can perform this action.');
					return;
				}

				this.join(args[0]);
				this.say(target, 'Joined ' + args[0]);
			});
		}
	},
	{
		name: 'repeat',
		desc: 'Repeats the same message over and over.',
		args: [
			{ name: 'text', required: true },
			{ name: 'num', required: true },
			{ name: 'channnel|nick', required: true }
		],
		def: function(args, target){
			var text = args[0];
			var num = parseInt(args[1]);
			var to = args[2];

			if(num > this.opts.repeat.maxnum){
				num = this.opts.repeat.maxnum;
			}

			while(num--){
				this.say(to, text);
			}
		}
	},
	{
		name: 'uptime',
		desc: 'Show bot uptime.',
		args: [],
		def: function(args, target){
			var timeDiff = (Date.now() - this.startTime) / 1000;
			// Format time
			var sec = Math.floor(timeDiff % 60);
			var min = Math.floor(timeDiff / 60 % 60);
			var hour = Math.floor(timeDiff / 3600 % 24);
			var day = Math.floor(timeDiff / 86400);

			this.say(target, 'Uptime: ' + day + ':' + hour + ':' + min + ':' + sec);
		}
	}
];