'use strict';

var fs = require('fs');
var path = require('path');

function Config(dir) {
  this.content = [];
  this.dir = path.resolve(dir);
}

Config.prototype.loadOption = function (keys, encoding) {
  if (!Array.isArray(keys)) {
    keys = [keys];
  }
  var self = this;
  keys.forEach(function (key) {
    self.content[key] = JSON.parse(fs.readFileSync(self.dir + '/' + key + '.json', encoding || 'utf8'));
  });
  if ('function' === typeof callback) {
    callback();
  }
};

Config.prototype.getOption = function (key) {
  var value = this.content;

  key.split('.').forEach(function (piece) {
    value = value[piece];
  });

  return value;
};

Config.prototype.record = function() {
  var self = this;
  this.content.forEach(function (config, file) {
    fs.writeFile(self.dir + '/' + file + '.json', JSON.stringify(config, null, 4));
  });
};

module.exports = Config;