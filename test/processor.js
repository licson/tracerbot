'use strict';

var should = require('should');
var Processor = require('../processor');

describe('Processor', function () {
  var processor = new Processor();
  it('should contains components', function() {
    processor.load(function () {
      processor.components.should.have.keys(['curl', 'gravy', 'ping', 'trace', 'bgp',
        'pops', 'ipinfo', 'asinfo', 'aspeer',
        'nmap', 'srg', 'admin', 'reload', 'join', 'repeat', 'uptime', 'restart', 'weather', 'forecast']);
    });
  });
  it('should generateHelpMessage', function () {
    processor.generateHelpMessage('curl').should.be.eql('-curl <url> [options]\nFetch resources over HTTP(s)/FTP.')
      .which.is.a.String();
  });
  it('should say into buffer', function () {
    processor.say('unknown', 'Testing');
    processor.buffer.should.have.ownProperty('unknown').which.is.a.Array();
    processor.buffer.unknown.should.have.length(1);
  });

  it('should load Config', function () {
    var Config = require('../config');
    var config = new Config(__dirname + '/../config/');
    config.loadOption(['admins', 'banlist', 'options']);
    processor.setConfig(config);
    processor.config.should.be.instanceof(Config).which.is.a.Object();
  });

  it('should ban list ok', function () {
    processor.checkBanList('seadog007', 'nmap').should.be.true();
    processor.checkBanList('kuro1130', 'ping').should.be.true();
  });

  it('should check args', function () {
    processor.checkArgs(['https://www.google.com'], 'curl').should.be.true();
    processor.checkArgs([], 'ping').should.not.be.true();
  });
});
