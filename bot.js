'use strict';

var irc = require('irc');
var fs = require('fs');
var Processor = require('./processor');
var Config = require('./config');

var Bot = function(){
	this.components = {};
	this.banlist = {};
	this.admins = [];
	this.opts = {};
	this.regexCache = {};

  this.processor = new Processor(this);
  this.config = new Config(__dirname + '/config/');

	this.irc = null;
	this.startTime = Date.now();
};

Bot.prototype.load = function(){
	this.loadOptions();
  this.processor.load();
  this.processor.setConfig(this.config);
	this.setupEventHandlers();
  this.processor.setSend(this.say.bind(this));
  this.processor.setAdminCheck(this.checkAdmin.bind(this));
};

Bot.prototype.loadOptions = function(){
  this.config.loadOption(['options', 'admins', 'banlist']);
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
			self.config.record();
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

Bot.prototype.join = function(channel){
	this.irc.join(channel);
};

Bot.prototype.checkAdmin = function(name, cb){
	var self = this;
	this.irc.whois(name, function(data){
		if(typeof data.account !== "undefined" && self.config.getOption('admins').indexOf(data.account) > -1){
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
};

Bot.prototype.processCommands = function(to, from, message){
	var cmd = message.substr(1);
	var parsed = this.parseCommandArguments(cmd);
	var command = parsed.shift();
	var args = parsed;

	console.log('Received command: cmd=%s, args=%s', command, args);
  this.processor.processCommand(command, args, from, to);
};

Bot.prototype.connect = function(){
	var self = this;

	this.irc = new irc.Client(
		this.config.getOption('options.irc.host'),
		this.config.getOption('options.botname'),
		{
			userName: this.config.getOption('options.irc.username'),
			realName: this.config.getOption('options.irc.realname'),
			secure: this.config.getOption('options.irc.secure'),
			port: this.config.getOption('options.irc.port'),
			floodProtection: true,
			channels: this.config.getOption('options.channels'),
			debug: false
		}
	);

	this.irc.addListener('message', function(from, to, message){
		console.log('%s => %s: %s', from, to, message);
		
		if(message.toLowerCase() == 'ping' && from.toLowerCase().indexOf('bot') < 0){
			self.say(to, 'pong');
			return;
		}
    var botname = self.config.getOption('options.botname');
		if(to == botname || self.config.getOption('options.channels').indexOf(to) > -1){
			if(message.substr(0, 1) == '-'){
				var target = (to == botname) ? from : to;
				self.processCommands(target, from, message);
			}
		}
	});

	this.irc.addListener('registered', function(){
		console.log('Connected to server %s!', self.config.getOption('options.irc.host'));
	});

	this.irc.addListener('join', function(chan, nick){
		console.log('%s: Joined %s', nick, chan);
	});


	this.irc.addListener('error', function(e){
		// Ignore Errors
	});
};

module.exports = Bot;