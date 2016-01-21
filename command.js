'use strict';

function CommandContext(processor, channel) {
  this.channel = channel;
  this.processor = processor;
  this.admins = this.processor.config.getOption('admins');
  this.uptime = processor.bot.startTime;
  this.bot = processor.bot;
}

CommandContext.prototype.say = function (message) {
  this.processor.say(this.channel, message);
};

CommandContext.prototype.checkAdmin = function(name, callback) {
  this.processor.checkAdmin(name, callback);
};

CommandContext.prototype.getOption = function(key) {
  if (!key.startWith('options.')) {
    key = 'options.' + key;
  }
  return this.processor.config.getOption(key);
};

CommandContext.prototype.reload = function (callback) {
  this.processor.reload(callback);
};

CommandContext.prototype.send = function() {
  this.processor.send(this.channel);
};

module.exports = CommandContext;