'use strict';

var should = require('should');
var Config = require('../config');
var path = require('path');

describe('Config', function () {
  it('should load admin config', function () {
    var config = new Config(__dirname + '/../config');
    config.should.have.property('dir').which.is.a.String();
    config.dir.should.be.eql(path.resolve(__dirname + '/../config'));
    config.loadOption('admins');
    config.loadOption('options');
    config.getOption('admins').should.have.length(4);
    config.getOption('options.irc.host').should.be.eql('banks.freenode.net').which.is.a.String();
  });
});