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
	
	if(p > 0.514444) windyness = 'light air';
	if(p > 2.05778) windyness = 'light breeze';
	if(p > 3.60111) windyness = 'gentle breeze';
	if(p > 5.65889) windyness = 'moderate breeze';
	if(p > 8.74556) windyness = 'fresh breeze';
	if(p > 11.3178) windyness = 'strong breeze';
	if(p > 14.4044) windyness = 'near gale';
	if(p > 17.4911) windyness = 'gale';
	if(p > 21.0922) windyness = 'strong gale';
	if(p > 24.6933) windyness = 'storm';
	if(p > 28.8089) windyness = 'violent storm';
	if(p > 32.9244) windyness = 'typhoon';

	return windyness;
};

var getPerceivedTemperature = function(temp, wind, humidity){
	var e = 6.122 * Math.pow(10, (7.5 * temp) / (237.7 + temp)) * (humidity / 100);
	return Math.round(1.07 * temp + 0.2 * e - 0.6 * wind - 2.7);	
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
			var city = encodeURIComponent(args[0]);

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
					output += 'Perceived temperature is ' + getPerceivedTemperature(info.main.temp - 273.15, info.wind.speed, info.main.humidity) + '°C\n';
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
			var city = encodeURIComponent(args[0]);

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
						var windyness = getWindDescription(forecast.wind.speed);
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