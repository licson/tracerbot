var mc, runner;

mc = require('minecraft-protocol');

runner = function(host, port, x, y, delay, username) {
  if (username == null) {
    username = (Math.floor(Math.random() * 0x7fffffffffffffff)).toString(36);
  }
  return setTimeout(function() {
    var client, id, reset;
    client = mc.createClient({
      host: host,
      port: port,
      username: username
    });
    id = null;
    client.on("connect", function() {
      return console.info('connected');
    });
    client.once("position", function(position) {
      var currentX, currentZ;
      try {
        client.write('chat', {
          message: "Oh this server is s**t!!"
        });
        client.write("position_look", {
          yaw: position.yaw,
          pitch: position.pitch,
          onGround: position.onGround,
          x: position.x,
          y: position.y,
          z: position.z,
          stance: position.y - 1.62
        });
      } catch (_error) {}
      currentX = position.x;
      currentZ = position.z;
      return id = setInterval(function() {
        var e;
        currentX += x;
        currentZ += y;
        try {
          return client.write("position_look", {
            yaw: 360 * Math.random(),
            pitch: position.pitch,
            onGround: position.onGround,
            x: currentX,
            y: 128,
            z: currentZ,
            stance: 128 - 1.62
          });
        } catch (_error) {
          e = _error;
          console.log(e);
          return reset();
        }
      }, 1000);
    });
    client.on('error', function(e) {
      console.log(e);
      return reset();
    });
    return reset = function() {
      clearInterval(id);
      if (client.socket) {
        try {
          client.socket.allowHalfOpen = true;
          client.socket.destroy();
        } catch (_error) {}
      }
      return runner(host, port, x, y, delay, username);
    };
  }, delay);
};

process.on('message', function(msg) {
  var all, angle, j, x, y, _results;
  all = msg.players;
  j = 0;
  _results = [];
  while (j < all) {
    angle = j / all * 2 * Math.PI;
    x = 10 * Math.cos(angle);
    y = 10 * Math.sin(angle);
    runner(msg.host, msg.port, x, y, 500 * j);
    _results.push(j++);
  }
  return _results;
});