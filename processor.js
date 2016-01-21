'use strict';

var fs = require('fs');
var Context = require('./command');

const OK = true;
const ERROR = false;

function CommandProcessor(bot) {
  this.components = {};
  this.config = null;
  this.sender = null;
  this.admin = null;

  this.buffer = [];
  this.regexCache = [];

  this.bot = bot
}

/**
 * Set Uptime
 * @param {Date}time
 */
CommandProcessor.prototype.setUptime = function (time) {
  this.uptime = time;
};

CommandProcessor.prototype.setAdminCheck = function(func) {
  if ('function' === typeof func)
    this.admin = func;
};

/**
 * Set Config Object
 * @param config
 */
CommandProcessor.prototype.setConfig = function(config) {
  this.config = config;
};

/**
 * Set send function
 * @param func function
 */
CommandProcessor.prototype.setSend = function(func) {
  if ('function' === typeof func) {
    this.sender = func;
  }
};

/**
 * Write Messaege to buffer
 * @param channel
 * @param message
 */
CommandProcessor.prototype.say = function(channel, message) {
  if (!(channel in this.buffer)) {
    this.buffer[channel] = [];
  }
  this.buffer[channel].push(message);
};

/**
 * Send all message in buffer to channel
 * @param channel
 */
CommandProcessor.prototype.send = function(channel) {
  if (!(channel in this.buffer) || !this.buffer[channel]) return;
  var self = this;
  this.buffer[channel].forEach(function (message) {
    console.log(channel + ': ' + message);
    self.sender(channel, message);
  });
  this.buffer[channel] = [];
};

/**
 * Load Components
 * @param {function} callback Optional Callback
 */
CommandProcessor.prototype.load = function (callback) {
  var self = this, path = __dirname + '/components/';
  var list = fs.readdirSync(path);
  list.forEach(function(component){
    var comp = require(path + component);
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
  if ('function' === typeof callback) {
    callback.call(this);
  }
};

/**
 * Generate Help Message of Command
 * @param {string} channel
 * @param {string} command
 * @returns {string}
 */
CommandProcessor.prototype.generateHelpMessage = function (command) {
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

    return str;
  }
};

/**
 * Check Command is able to be run
 * @param {string} user
 * @param {string} cmd
 * @returns {boolean}
 */
CommandProcessor.prototype.checkBanList = function(user, cmd) {
  var banlist = this.config.getOption('banlist.' + cmd);
  if(Array.isArray(banlist)){
    if(banlist.length === 0){
      return OK;
    }

    var result = OK;

    if(Array.isArray(this.regexCache[cmd])){
      this.regexCache[cmd].forEach(function(rule){
        if(rule.test(user)) result = result && false;
      });
    }
    else {
      var self = this;
      this.regexCache[cmd] = [];

      banlist.forEach(function(rule){
        self.regexCache[cmd].push(new RegExp(rule, "gi"));
      });

      banlist.forEach(function(rule){
        if(rule.test(user)) result = result && ERROR;
      });
    }

    return result;
  }
  else {
    return OK;
  }
};

/**
 * Check arguments of command.
 * @param args
 * @param command
 * @returns {boolean}
 */
CommandProcessor.prototype.checkArgs = function(args, command) {
  if(command in this.components){
    var checkItems = this.components[command].args;
    if(args.length >= checkItems.length || checkItems.length == 0){
      return OK;
    }
    else {
      var result = OK;
      for(var i = 0; i < checkItems.length; i++){
        if(!args[i] && checkItems[i].required) result = result && ERROR;
      }

      return result;
    }
  } else {
    // Probably a bug if we hit here.
    return ERROR;
  }
};

/**
 * Check User is admin or not
 * @param {string}name
 * @param {function}callback
 */
CommandProcessor.prototype.checkAdmin = function(name, callback) {
  this.admin(name, callback);
};

/**
 * Process Command.
 * @param command
 * @param args
 * @param source
 * @param channel
 */
CommandProcessor.prototype.processCommand = function(command, args, source, channel) {
  if (!(this.checkBanList(source, 'all') && this.checkBanList(source, command))) {
    this.say(channel, 'You are banned from using the command.');
    this.send(channel);
    return;
  }

  if(command.toLowerCase() == 'help'){
    if(args[0]){
      this.generateHelpMessage(args[0]);
    }
    else {
      this.say(channel, 'Available commands: ' + Object.keys(this.components).join(', '));
    }
  }
  else if(command in this.components) {
    var selectedCommand = this.components[command];
    if(this.checkArgs(args, command)){
      var context = new Context(this, channel);
      selectedCommand.def.apply(context, [args, channel, source]);
    }
    else {
      this.say(channel, 'Missing arguments!');
      var help = this.generateHelpMessage(command);
      this.say(help);
    }
  }
  else {
    this.say(channel, 'No such command: ' + command);
    this.say(channel, 'Use -help to get a list of commands, or -help <command> for usage.');
  }
  this.send(channel);
};

/**
 * Reload Config
 * @param callback
 */
CommandProcessor.prototype.reload = function (callback) {
  this.config.load('options', 'utf-8', callback);
};

module.exports = CommandProcessor;