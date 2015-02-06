tracerbot
==============

A special IRC bot for the needy. It contains some surprise features that you may feel useful from time to time.

P.S. If you see Chinese in the code, that's because the bot is originally made for a Chinese IRC community.
I'll change that to English if I have time. :)

Installation
==============

	npm install && node bot.js

Edit `admins.json` and add your name inside. This allows you to unleash the full power of the bot.

You may also need to install the following dependencies for some function to work.

	apt-get install nmap curl

You may change the channel by editing line 12 of `bot.js` to other valid channel names. The bot's name and indent can also be changed in a similar fashion.

P.S. A module `minecraft-protocol` may cause you some trouble to install if you're using Windows. Please check
[here](https://github.com/NodePrime/ursa) regarding that.

How to use
==============

You can issue commands by using the `-` prefix followed by the commands you want to execute.

For example: `-someCommand some long long long-arguments`

The following are the commands that you can use. Execute them to learn how to use it.

1.  admins
2.  banlist
3.  bgp
4.  curl
5.  forward
6.  gravy
7.  help
8.  nmap
9.  ping
10. pops
11. trace

License
==============

MIT.