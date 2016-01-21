'use strict';

var request = require('request');

const supportLanguage = {
	'php': searchPackagist,
	'ruby': searchGem
};

function searchPackagist(query) {
	var self = this;
	request('https://packagist.org/search.json?q=' + query, function(e, response, body){
		if (!e && response.statusCode === 200) {
			var info = JSON.parse(body).results;
			for (var i = 0; i < 5; i++) {
				self.say('Name: ' + info[i].name + ' (' + info[i].url +')');
			}
		} else {
			self.say('Error: Fail to connect to Packagist');
		}
		self.send();
	});
}

function searchGem(query) {
	var self = this;
	request('https://rubygems.org/api/v1/search.json?query=' + query, function(e, response, body) {
		if (!e && response.statusCode === 200) {
			var info = JSON.parse(body);
			for (var i = 0; i< 5; i++) {
				self.say('Name: ' + info[i].name + ' (' + info[i]['project_uri'] + ')');
			}
		} else {
			self.say('Error: Fail to connect to RubyGems')
		}
		self.send();
	});
}

var languageSupport = {
	name: 'support',
	desc: 'Get Support Language',
	args: [],
	def: function(args, target) {
		this.say('Support Language for Package Search:');
		for (var language in supportLanguage) {
			this.say(language);
		}
	}
};

var packageSearch = {
	name: 'package',
	desc: 'Search for packages',
	args: [
		{name: 'language', required: true},
		{name: 'query'}
	],
	def: function(args, target) {
		if (args[0] in supportLanguage)
			supportLanguage[args[0]].call(this, [args[1]]);
		else
			this.say('Unsupported Language');
	}
};

module.exports = [packageSearch, languageSupport];