var request = require('request');

module.exports = [
	{
		name: 'weather',
		desc: 'Provides basic weather information.',
		args: [
			{ name: 'city', required: true }
		],
		def: function(args, target){
			var self = this;
			var city = args[0].replace(/(&|\?|=)/g, '');

			request('http://api.openweathermap.org/data/2.5/weather?q=' + city, function(e, res, body){
				if(!e && res.statusCode == 200){
					var info = JSON.parse(body);
					var output = '';
					var cloudiness = 'cloudy';
					var windyness = 'no wind';

					if(info.cod != 200){
						self.say(target, info.message);
						return;
					}

					if(info.clouds.all < 80){
						cloudiness = 'slightly cloudy';
					}

					if(info.clouds.all < 30){
						cloudiness = 'clear';
					}

					if(info.wind.speed > 30){
						windyness = 'have typhoons';
					}

					if(info.wind.speed > 15){
						windyness = 'have strong wind';
					}

					if(info.wind.speed > 5){
						windyness = 'windy';
					}

					// Construct the message
					output += 'Current weather in '  + info.name + ', ' + info.sys.country + ': ' + info.weather[0].description;
					output += '\nCurrent temperature is ' + Math.round(info.main.temp - 273.15) + '°C, with humidity of ' + info.main.humidity + '%,\n';
					output += 'Today is ' + cloudiness + ' and ' + windyness;

					self.say(target, output);
				}
			});
		}
	}
];