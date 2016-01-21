var fs = require('fs');

module.exports = [
	{
		name: 'admin',
		desc: 'Performs administrative operations.',
		args: [
			{ name: 'ban|unban|deop|op', required: true },
			{ name: 'options', required: false }
		],
		def: function(args, target, from){
			this.checkAdmin(from, function(admin){
				if(!admin){
					this.say('Only authorized person can perform this action.');
					return;
				}

				switch(args[0]){
					case "op":
					if(this.admins.indexOf(args[1]) < 0){
						this.admins.push(args[1]);
						this.say('Successfully added ' + args[1] + ' as an operator.');
					}
					else {
						this.say('User ' + args[1] + ' is already an operator.');
					}
					break;

					case "deop":
					this.admins.indexOf(args[1]) > -1 && this.admins.splice(this.admins.indexOf(args[1]), 1);
					this.say('User ' + args[1] + ' is no longer an operator.');
					break;

					case "ban":
					var cmd = args[1];
					var user = args[2];

					if(!cmd || !user){
						this.say('Please specify the user and command to be banned.');
						return;
					}

					if(Array.isArray(this.banlist[cmd])){
						this.banlist[cmd].push(user);
					}
					else {
						this.banlist[cmd] = [];
						this.banlist[cmd].push(user);
					}
					this.say('Banned ' + user + ' from executing ' + cmd + '!');
					break;

					case "unban":
					var cmd = args[1];
					var user = args[2];

					if(!cmd || !user){
						this.say('Please specify the user and command to be banned.');
						return;
					}

					if(this.banlist[cmd].indexOf(user) > -1){
						this.banlist[cmd].splice(this.banlist[cmd].indexOf(user), 1);
						this.regexCache[cmd] = null;
					}

					this.say('Unbanned ' + user + ' from executing ' + cmd + '!');
					break;

					default:
					this.say('I don\'t understand what you\'re doing.');
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
			this.reload(function () {
				self.say(target, 'Reload complete.');
				self.send();
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

				this.bot.join(args[0]);
				this.bot.say(to, 'Joined ' + args[0]);
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

			if(to == this.getOption('options.irc.botname')){
				this.say(target, "You can't do this.");
				return;
			}

			if(num > this.getOption('repeat.maxnum')){
				num = this.getOption('repeat.maxnum');
			}

			while(num--){
				this.bot.say(to, text);
			}
		}
	},
	{
		name: 'uptime',
		desc: 'Show bot uptime.',
		args: [],
		def: function(args, target){
			var timeDiff = (Date.now() - this.uptime) / 1000;
			// Format time
			var sec = Math.floor(timeDiff % 60);
			var min = Math.floor(timeDiff / 60 % 60);
			var hour = Math.floor(timeDiff / 3600 % 24);
			var day = Math.floor(timeDiff / 86400);

			this.say('Uptime: ' + day + ':' + hour + ':' + min + ':' + sec);
		}
	},
	{
		name: 'restart',
		desc: 'Restarts the bot without exiting the program.',
		args: [],
		def: function(args, target, from){
			this.checkAdmin(from, function(admin){
				var self = this;

				if(!admin){
					this.say('Only authorized person can perform this action.');
					return;
				}

				this.say('The bot will soon restart.');
				setTimeout(function(){
					self.irc.disconnect('Restarting...', function(){
						global.ircBot = new global.Bot();
					});
				}, 500);
			});
		}
	}
];