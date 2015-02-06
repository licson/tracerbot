var irc = require('irc');
var request = require('request');
var cheerio = require('cheerio');
var spawn = require('child_process').spawn;
var fork = require('child_process').fork;
var fs = require('fs');

var IP_ADDRESS = /^([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])$/;
var IP_RANGES = /^([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\/([0-9]){0,3}$/;
var HOST_RANGES = /^(.*)(\/([0-9]){0,3})$/;

var channel = '#ysitd';
var su = JSON.parse(fs.readFileSync(__dirname + '/admins.json', 'utf8'));
var banlist = JSON.parse(fs.readFileSync(__dirname + '/banlist.json', 'utf8'));
var rate_limiting = { nmap:[], curl:[] };
var attacking = false;
var attack_modules = {};
var forward = false;

var bot = new irc.Client('asimov.freenode.net', 'tracerbot', {
	userName: 'trace',
	realName: 'tracer by Licson',
	debug: true,
	secure: true,
	port: 6697,
	floodProtection: true,
	channels: [channel]
});

var r = request.defaults({
	headers: {
		'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.85 Safari/537.36'
	}
});

process.stdin.resume();
process.nextTick(function() {
	process.on(['SIGINT', 'SIGHUP'], function(){
		fs.writeFileSync(__dirname + '/admins.json', JSON.stringify(su));
		fs.writeFileSync(__dirname + '/banlist.json', JSON.stringify(banlist));
		process.exit(0);
	});
});

bot.addListener('error', function(message){
	console.log('Error occured!', message);
});

bot.addListener('message' + channel, function(from, message){
	if(message.toLowerCase() == 'ping' && from.toLowerCase().indexOf('bot') < 0){
		bot.say(channel, 'pong');
	}
	else {
		handleCommand(from, '#ysitd', message);
	}
});

bot.addListener('message', function(from, to, message){
	if(to == 'tracerbot'){
		to = from;

		handleCommand(from, to, message);
	}
});

bot.addListener('ping', function(){
	console.log('Received CTCP Ping ');
});

var lg = function(to, from, ops, args){
	if(args.length == 2){
		var who = target(from);
		var loc = args[0];
		var host = args[1];
		var router_map = {
			'hkg': 'HongKong',
			'tpe': 'Taiwan',
			'lon': 'London',
			'atl': 'crissic'
		}

		switch(loc){
			case 'hkg':
			case 'tpe':
			case 'lon':
				r.post({
					url: 'http://lg.ibeo.hgc-intl.com/cgi-bin/flg.cgi',
					form: {
						router: router_map[loc],
						query: ops,
						addr: host
					}
				}, function(e, res, body){
					if(e){
						bot.say(who, '錯誤：無法連線至路由器。');
					}
					else {
						bot.say(who, ops + ' 已經完成，請檢查私人訊息。');

						var $ = cheerio.load(body);
						var info = $('pre').text();
						var lines = info.split("\n");

						lines.forEach(function(line, i){
							bot.say(forward !== false ? who : to, line);
						});
					}
				});
			break;

			case 'atl':
				r(
					'http://lg.crissic.net/ajax.php?cmd=' + ops + '&host=' + host,
					function(e, req, body){
						if(e){
							bot.say(who, '錯誤：無法連線至路由器。');
						}
						else {
							bot.say(who, ops + ' 已經完成，請檢查私人訊息。');
							var lines = body.replace("\n", '').split("<br />");

							lines.forEach(function(line, i){
								bot.say(forward !== false ? who : to, line.trim().replace('&nbsp;', ' '));
							});
						}
					}
				);
			break;

			default:
			bot.say(who, '路由器名稱錯誤！');
			break;
		}
	}
};

var target = function(from){
	if(forward !== false){
		return forward;
	}
	else {
		return (from != channel ? from : channel);
	}
}

var checkAdmin = function(name, cb){
	bot.whois(name, function(data){
		if(typeof data.account !== "undefined" && su.indexOf(data.account) > -1){
			cb(true);
		}
		else {
			cb(false);
		}
	});
};

var commands = {
	ping: function(to, from, args){
		var who = target(from);

		if(args.length < 2){
			bot.say(who, '參數錯誤！');
			bot.say(who, '-ping <router> <host>');
			bot.say(who, '傳送ICMP回應封包到指定的目標主機，請使用 -pops 獲取所有在線的路由器。');
		}
		else {
			lg(to, from, 'ping', args);
		}
	},
	trace: function(to, from, args){
		var who = target(from);

		if(args.length < 2){
			bot.say(who, '參數錯誤！');
			bot.say(who, '-trace <router> <host>');
			bot.say(who, '對指定的目標主機進行路由追蹤，請使用 -pops 獲取所有在線的路由器。');
		}
		else {
			lg(to, from, 'traceroute', args);
		}
	},
	pops: function(to, from, args){
		var who = target(from);

		bot.say(who, '路由器列表：');
		bot.say(who, 'hkg - Hong Kong, HK');
		bot.say(who, 'tpe - Taipei, TW');
		bot.say(who, 'lon - London, UK');
		bot.say(who, 'atl - Atlanta, GA, US');
	},
	help: function(to, from, args){
		var who = target(from);

		bot.say(who, '可用指令：');
		bot.say(who, Object.keys(commands).sort().join(' '));
	},
	bgp: function(to, from, args){
		var who = target(from);

		if(args.length < 1){
			bot.say(who, '參數錯誤！');
			bot.say(who, '-bgp <IPv4 Address>');
			bot.say(who, '檢查路由器BGP路徑。');
		}
		else {
			if(!IP_ADDRESS.test(args[0])){
				bot.say(who, '參數並不是有效的IPv4位置！');
				return;
			}

			lg(to, from, 'bgp route', ['hkg', args[0]]);
		}
	},
	nmap: function(to, from, args){
		var who = target(from);

		if(rate_limiting.nmap.indexOf(to) > -1){
			bot.say(who, '每一名用戶只可以每五分鐘執行一次 nmap 指令！');
			return;
		}

		if(args.length < 1){
			bot.say(who, '參數錯誤！');
			bot.say(who, '-nmap [Scan Type(s)] [Options] {target specification}');
			bot.say(who, '對目標主機進行連接埠掃描。');
		}
		else {
			bot.say(who, 'nmap正在執行中，請檢查私人訊息。');
			rate_limiting.nmap.push(to);
			
			setTimeout(function(){
				rate_limiting.nmap.splice(rate_limiting.nmap.indexOf(to), 1);
			}, 300000);

			for(var i = 0; i < args.length; i++){
				if(IP_RANGES.test(args[i]) == true || HOST_RANGES.test(args[i]) == true){
					bot.say(who, 'nmap: IP range scan is disabled to prevent abuse.');
					return;
				}
			}

			var nmap = spawn('nmap', ['--unprivileged'].concat(args));

			nmap.stdout.on('data', function(data){
				bot.say(forward !== false ? who : to, data);
			});

			nmap.stderr.on('data', function(data){
				bot.say(forward !== false ? who : to, data);
			});

			nmap.stdout.on('error', function(e){
				bot.say(who, '錯誤：' + e.toString());
			});

			nmap.on('error', function(e){
				bot.say(who, '錯誤：' + e.toString());
			});

			nmap.on('close', function(){
				console.log('nmap finished.');
			});
		}
	},
	forward: function(to, from, args){
		var who = target(from);

		if(su.indexOf(to) < 0){
			bot.say(who, '嗯... 看起來你不夠權限哦！');
		}
		else {
			if(args.length < 1 && forward !== false){
				forward = false;
				bot.say(who, '對 ' + who + ' 的訊息轉發已停止。');
			}
			else if(args.length >= 1){
				forward = args[0];

				if(forward.indexOf('#') == 0){
					bot.join(forward, function(){});
				}

				bot.say(who, '開始轉發訊息至 ' + forward);
			}
			else {
				bot.say(who, '參數錯誤！');
				bot.say(who, '-forward [user|channel]');
				bot.say(who, '把tracer產生的所有訊息轉移至指定的用戶或是群組。在測試期間很有用。');
			}
		}
	},
	admins: function(to, from, args){
		var who = target(from);

		if(args.length < 1){
			bot.say(who, '管理員：' + su.join(', '));
			return;
		}

		checkAdmin(to, function(result){
			if(!result){
				bot.say(who, '嗯... 看起來你不夠權限哦！');
				return;
			}

			if(args.length > 1) {
				switch(args[0]){
					case 'add':
					if(su.indexOf(args[1]) < 0){
						su.push(args[1]);
						bot.say(who, '成功新增 ' + args[1] + ' 為管理員');
					}
					else {
						bot.say(who, args[1] + ' 已經是管理員了！');
					}
					break;

					case 'delete':
					su.indexOf(args[1]) > -1 && su.splice(su.indexOf(args[1]), 1);
					bot.say(who, '成功刪除 管理員' + args[1]);
					break;

					default:
					bot.say(who, '參數錯誤！');
					bot.say(who, '-admins <add | delete> [username]');
					bot.say(who, '管理tracer的管理員。');
					break;
				}
			}
			else {
				bot.say(who, '參數錯誤！');
				bot.say(who, '-admins <add | delete> [username]');
				bot.say(who, '管理tracer的管理員。');
			}
		});
	},
	curl: function(to, from, args){
		var who = target(from);

		if(args.length < 1){
			bot.say(who, '參數錯誤！');
			bot.say(who, '-curl <URL>');
			bot.say(who, '傳送HTTP GET請求至指定URL');
			return;
		}

		if(rate_limiting.curl.indexOf(to) > -1){
			bot.say(who, '每一名用戶只可以每三十秒執行一次 curl 指令！');
		}
		else {
			rate_limiting.curl.push(to);
			setTimeout(function(){
				rate_limiting.curl.splice(rate_limiting.curl.indexOf(to), 1);
			}, 30000);

			var url = args[0].indexOf('http:') == -1 ? 'http://' + args[0] : args[0];
			var i = 0;

			r(url, function(e, res, body){
				if(!e){
					bot.say(forward !== false ? forward : to, body.substr(0, 1024));
				}
				else {
					bot.say(forward !== false ? forward : to, '錯誤：' + e.toString());
				}
			});
		}
	},
	banlist: function(to, from, args){
		var who = target(from);

		checkAdmin(to, function(result){
			if(!result){
				bot.say(who, '嗯... 看起來你不夠權限哦！');
				return;
			}

			if(args.length >= 3){
				switch(args[0]){
					case 'add':
					
					if(Array.isArray(banlist[args[1]])){
						banlist[args[1]].push(args[2]);
					}
					else {
						banlist[args[1]] = [];
						banlist[args[1]].push(args[2]);
					}
					bot.say(who, '已新增 ' + to + ' 到黑名單！');

					break;

					case 'delete':
					banlist[args[1]].indexOf(args[2]) > -1 && banlist[args[1]].splice(banlist[args[1]].indexOf(args[2]), 1);

					bot.say(who, '已把 ' + args[2] + ' 從黑名單刪除！');
					break;

					default:
					bot.say(who, '參數錯誤！');
					bot.say(who, '-banlist <add | delete> [command] [username]');
					bot.say(who, '管理tracer的黑名單。');
					break;
				}
			}
			else {
				bot.say(who, '參數錯誤！');
				bot.say(who, '-banlist <add | delete> [command] [username]');
				bot.say(who, '管理tracer的黑名單。');
			}
		});
	},
	gravy: function(to, from, args){
		var who = target(from);
		
		checkAdmin(to, function(result){
			if(!result){
				bot.say(who, '嗯... 看起來你不夠權限哦！');
				return;
			}
			
			if(attacking === true && !(args.length == 1 && args[0] == 'stop')){
				bot.say(who, 'tracer只能專注一次攻擊一個目標！');
				return;
			}
			
			if(args.length == 1 && args[0] == 'stop'){
				attack_modules.minecraft.kill('SIGINT');
				return;
			}
			
			if(args.length >= 2){
				attack_modules.minecraft = fork(__dirname + '/minecraft.js');
				var minecraft = attack_modules.minecraft;
				attacking = true;
		
				minecraft.on('exit', function(){
					attacking = false;
					bot.say(who, '已停止攻擊 ' + args[0] + '！');
				});
				
				minecraft.send({ host: args[0], port: args[1] });
				bot.say(who, '開始攻擊 ' + args[0] + '！');
			}
			else {
				bot.say(who, '參數錯誤！');
				bot.say(who, '-gravy [host] [port]');
				bot.say(who, '把目標Minecraft伺服器徹底毀滅！支援版本 1.7.10 的伺服器。');
				bot.say(who, '使用 -gravy stop 以停止攻擊。');
			}
		});
	}
};

function checkBan(from, command){
	if(!banlist[command]) return false;

	if(Array.isArray(banlist[command]) && banlist[command].indexOf(from) > -1){
		return true;
	}
	else {
		return false;
	}
};

function handleCommand(from, to, message){
	var who = (to != channel ? to : channel);

	if(message.substr(0, 1) == '-'){
		var parts = message.substr(1).split(' ');
		var cmd = parts.shift();

		if(commands[cmd]){
			if(!checkBan(from, cmd)){
				commands[cmd](from, to, parts);	
			}
			else {
				bot.say(who, '你已被禁止使用 ' + cmd + ' 指令！');
			}
		}
		else {
			if(!(/(-){2,}(.*)(-*)/.test(message))){
				bot.say(who, '不支援指令，請執行 -help 以獲得說明。');
			}
		}
		
		console.log('User %s sent command: %s', from, message);
	}
};
