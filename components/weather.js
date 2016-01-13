var request = require('request');
var moment = require('moment');

var getCloudiness = function(p){
	var cloudiness = 'cloudy';

	if(p < 80){
		cloudiness = 'slightly cloudy';
	}

	if(p < 30){
		cloudiness = 'clear';
	}

	return cloudiness;
};

var getWindDescription = function(p){
	var windyness = 'no wind';

	if(p > 30){
		windyness = 'have typhoons';
	}

	if(p > 15){
		windyness = 'have strong wind';
	}

	if(p > 5){
		windyness = 'windy';
	}

	return windyness;
};

var getPreceivedTemperature = function(temp, humidity){
	var e = 6.122 * Math.pow(10, (7.5 * temp) / (237.7 + temp)) * (humidity / 100);
	return Math.round(temp + (5 / 9) * (e - 10));	
};

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

			request('http://api.openweathermap.org/data/2.5/weather?q=' + city + '&appid=' + this.opts.weather.key, function(e, res, body){
				if(!e && res.statusCode == 200){
					var info = JSON.parse(body);
										
					if(parseInt(info.cod) != 200){
						self.say(target, info.message);
						return;
					}
					
					var output = '';
					var cloudiness = getCloudiness(info.clouds.all);
					var windyness = getWindDescription(info.wind.speed);

					// Construct the message
					output += 'Current weather in '  + info.name + ', ' + info.sys.country + ': ' + info.weather[0].description;
					output += '\nCurrent temperature is ' + Math.round(info.main.temp - 273.15) + '°C, with humidity of ' + info.main.humidity + '%,\n';
					output += 'Preceived temperature is ' + getPreceivedTemperature(info.main.temp - 273.15, info.main.humidity) + '°C\n';
					output += 'Today is ' + cloudiness + ' and ' + windyness;

					self.say(target, output);
				}
				else {
					self.say(target, 'Error: Cannot get weather data at this moment.');
				}
			});
		}
	},
	{
		name: 'forecast',
		desc: 'Provides a 7-day weather forecast of a city.',
		args: [
			{ name: 'city', required: true }
		],
		def: function(args, target){
			var self = this;
			var city = args[0].replace(/(&|\?|=)/g, '');

			request('http://api.openweathermap.org/data/2.5/forecast/daily?cnt=7&q=' + city + '&lang=' + this.opts.weather.language + '&appid=' + this.opts.weather.key, function(e, res, body){
				if(!e && res.statusCode == 200){
					var info = JSON.parse(body);
					var str = '';

					if(parseInt(info.cod) != 200){
						self.say(target, info.message);
						return;
					}

					self.say(target, 'Weather forecast for ' + info.city.name + ', ' + info.city.country + ':');

					info.list.forEach(function(forecast){
						var time = moment(forecast.dt * 1000);
						var tempMin = Math.round(forecast.temp.min - 273.15);
						var tempMax = Math.round(forecast.temp.max - 273.15);
						var desc = forecast.weather[0].description;
						var windyness = getWindDescription(forecast.speed);
						var cloudiness = getCloudiness(forecast.clouds);
						var output = time.format('ddd Do, MMM') + ' - ' + desc + '; ';
						
						output += 'Temperature: ' + tempMin + ' - ' + tempMax + '°C, that day is ' + cloudiness + ' and ' + windyness;
						str += output + '\n';
					});
					
					self.say(target, str);
				}
				else {
					self.say(target, 'Error: Cannot get forecast data at this moment.');
				}
			});
		}
	}
];