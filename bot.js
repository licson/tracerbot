var irc = require('irc');
var fs = require('fs');

var Bot = function(){
	this.components = {};
	this.banlist = {};
	this.admins = [];
	this.opts = {};
	this.regexCache = {};

	this.irc = null;
	this.startTime = Date.now();
};

Bot.prototype.load = function(){
	this.loadOptions();
	this.loadComponents();
	this.setupEventHandlers();
};

Bot.prototype.loadOptions = function(){
	this.opts = JSON.parse(fs.readFileSync(__dirname + '/config/options.json', 'utf8'));
	this.admins = JSON.parse(fs.readFileSync(__dirname + '/config/admins.json', 'utf8'));
	this.banlist = JSON.parse(fs.readFileSync(__dirname + '/config/banlist.json', 'utf8'));
};

Bot.prototype.loadComponents = function(){
	var self = this;
	var list = fs.readdirSync(__dirname + '/components/');
	list.forEach(function(component){
		var comp = require(__dirname + '/components/' + component);
		console.log('Loaded component %s', component);

		if(Array.isArray(comp)){
			comp.forEach(function(subs){
				console.log('Loaded command definition %s from component %s', subs.name, component);
				self.components[subs.name] = subs;
			});
		}
		else {
			console.log('Loaded command definition %s from component %s', comp.name, component);
			self.components[comp.name] = comp;
		}
	});
};

Bot.prototype.setupEventHandlers = function(){
	var self = this;

	process.stdin.resume();
	process.nextTick(function() {
		process.on('exit', function(){
			fs.writeFileSync(__dirname + '/config/admins.json', JSON.stringify(self.admins, null, 4));
			fs.writeFileSync(__dirname + '/config/banlist.json', JSON.stringify(self.banlist, null, 4));
			fs.writeFileSync(__dirname + '/config/options.json', JSON.stringify(self.opts, null, 4));
		});
		
		process.on('SIGINT', function(){
			process.nextTick(function(){
				process.exit();
			});
		});
	});
};

Bot.prototype.parseCommandArguments = function(command){
	var args = [];
	var readingPart = false;
	var lookForQuotes = true;
	var part = '';
	for(var i = 0; i < command.length; i++){
		if(command.charAt(i) === ' ' && !readingPart) {
			args.push(part);
			part = '';
		}
 		else {
			if(command.charAt(i) === '\"' && lookForQuotes) {
				readingPart = !readingPart;
			}
			else {
				part += command.charAt(i);
			}
		}
	}
	args.push(part);
	
	return args;
};

Bot.prototype.generateHelpMessage = function(target, command){
	if(command in this.components){
		var component = this.components[command];
		var str = '-' + command;
		
		component.args.forEach(function(arg){
			if(arg.required){
				str += (' <' + arg.name + '>');
			}
			else {
				str += (' [' + arg.name + ']');
			}
		});

		str += '\n';
		str += component.desc;

		this.say(target, str);
	}
	else {
		return;
	}
};

Bot.prototype.checkArgs = function(args, command){
	if(command in this.components){
		var checkItems = this.components[command].args;
		if(args.length >= checkItems.length || checkItems.length == 0){
			return true
		}
		else {
			var ok = true;

			for(var i = 0; i < checkItems.length; i++){
				if(!args[i]){
					if(checkItems[i].required) ok = ok && false;
				}
			}

			return ok;
		}
	}
	else {
		// Probably a bug if we hit here.
		return false;
	}
};

Bot.prototype.say = function(target, msg){
	this.irc.say(target, msg);
};

Bot.prototype.join = function(chan){
	this.irc.join(chan);
};

Bot.prototype.checkAdmin = function(name, cb){
	var self = this;
	this.irc.whois(name, function(data){
		if(typeof data.account !== "undefined" && self.admins.indexOf(data.account) > -1){
			cb.call(self, true);
		}
		else {
			cb.call(self, false);
		}
	});
};

Bot.prototype.checkBanList = function(user, cmd){
	if(Array.isArray(this.banlist[cmd])){
		if(this.banlist[cmd].length === 0){
			return true;
		}
		
		var result = true;
		
		if(Array.isArray(this.regexCache[cmd])){
			this.regexCache[cmd].forEach(function(rule){
				if(rule.test(user)) result = result && false; 
			});
		}
		else {
			var self = this;
			this.regexCache[cmd] = [];
			
			this.banlist[cmd].forEach(function(rule){
				self.regexCache[cmd].push(new RegExp(rule, "gi"));
			});
			
			this.regexCache[cmd].forEach(function(rule){
				if(rule.test(user)) result = result && false; 
			});
		}
		
		return result;
	}
	else {
		return true;
	}
}

Bot.prototype.processCommands = function(to, from, message){
	var cmd = message.substr(1);
	var parsed = this.parseCommandArguments(cmd);
	var command = parsed.shift();
	var args = parsed;

	console.log('Received command: cmd=%s, args=%s', command, args);

	if(!this.checkBanList(from, 'all')){
		return;
	}

	if(!this.checkBanList(from, command)){
		this.say(to, 'You are banned from using the command.');
		return;
	}

	if(command.toLowerCase() == 'help'){
		if(args[0]){
			this.generateHelpMessage(to, args[0]);
		}
		else {
			this.say(to, 'Available commands: ' + Object.keys(this.components).join(', '));
		}
	}
	else if(command in this.components) {
		var selectedCommand = this.components[command];
		if(this.checkArgs(args, command)){
			selectedCommand.def.apply(this, [args, to, from]);
		}
		else {
			this.say(to, 'Missing arguments!');
			this.generateHelpMessage(to, command);
		}
	}
	else {
		this.say(to, 'No such command: ' + command);
		this.say(to, 'Use -help to get a list of commands, or -help <command> for usage.');
	}
};

Bot.prototype.connect = function(){
	var self = this;

	this.irc = new irc.Client(
		this.opts.irc.host,
		this.opts.botname, 
		{
			userName: this.opts.irc.username,
			realName: this.opts.irc.realname,
			secure: this.opts.irc.secure,
			port: this.opts.irc.port,
			floodProtection: true,
			channels: this.opts.channels,
			debug: false
		}
	);

	this.irc.addListener('message', function(from, to, message){
		console.log('%s => %s: %s', from, to, message);
		
		if(message.toLowerCase() == 'ping' && from.toLowerCase().indexOf('bot') < 0){
			self.say(to, 'pong');
			return;
		}

		if(to == self.opts.botname || self.opts.channels.indexOf(to) > -1){
			if(message.substr(0, 1) == '-'){
				var target = (to == self.opts.botname) ? from : to;
				self.processCommands(target, from, message);
			}
		}
	});

	this.irc.addListener('registered', function(){
		console.log('Connected to server %s!', self.opts.irc.host);
	});

	this.irc.addListener('join', function(chan, nick){
		console.log('%s: Joined %s', nick, chan);
	});


	this.irc.addListener('error', function(e){
		// Ignore Errors
	});
};

module.exports = Bot;