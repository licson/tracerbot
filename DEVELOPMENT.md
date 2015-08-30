Directory Structure
================
- `components` - Plugins (automatically loaded)
- `modules` - Plugin dependencies should put here
- `config` - Configuration storage

Plugin Loading
================
Plugins are automatically loaded at startup. Just put your plugin files in the `components` directory and
it'll load into the bot.

Plugin content
================
All plugin files should export one or more functions, each of them is an object describing itself and their definitions.
Here is an example:

	module.export = {
		name: "say", // The name of your command
		desc: "Say something!", // Give it some description
		// Describe what the user should provide with
		args: [
			{
				name: "pharse", // The name of this field
				required: true // Whether it is required, input will first be validated
			}
		],
		// And here is your command definition
		// every call will pass 3 arguments
		// args (array) - The user input
		// target (string) - The place you should send the output to
		// from (string) - The caller of the function
		def: function(args, target, from){
			// Inside this function, it shares the same context as
			// the bot class in bot.js, you can directly call them
			// wherever you need.
			this.say(from + ' said: ' + args[0]); // Outputs a message
		}
	}

Multiple command definition can be done like this:

	module.export = [
		[command 1],
		[command 2],
		...
	]

If you want some more information, look at the code directly, it's really straightforward.