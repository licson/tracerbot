'use strict';

var Tracer = require('./bot');

var tracer = new Tracer();
tracer.load();
tracer.connect();

var stdin = process.openStdin();
stdin.addListener('data', function (data) {
  tracer.processCommands('#ysitd', 'unknown', data.toString().trim());
  console.log('Finish Response');
  console.log(tracer.processor.buffer);
});

global.Bot = Tracer;
global.ircBot = tracer;
