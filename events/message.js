const Event = require('../bot/event.js');

class Message extends Event {
  constructor() {
    super('messageCreate', false);
  }

  execute(message, client) {
    // Ignore bots
    if (message.author.bot) return;

    const prefix = client.prefix(); // Pass message here when server prefixes are set up

    if (message.content.startsWith(`<@!${client.user.id}>`))
      return message.reply({ content: `Use \`${prefix}help\` to get started!`});

    if (!message.content.startsWith(prefix)) return; // Ignore non-commands
    
    const args = message.content.slice(prefix.length).trim().split(/ +/); // Split every word of message into list
    const commandName = args.shift().toLowerCase(); // Extract command name and finalize args list

    const command = client.commands.get(commandName) // Search for command name
      || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName)); // Or look for potential aliases
    if (!command) return;

    if (command.guildOnly && message.channel instanceof DMChannel) {
      return message.channel.send("This command cannot be executed inside of DMs."); // WIP
    }

    if (command.devOnly && !client.isDev(message.author.id)) return; // Ignore other attempts to trigger dev commands

    if (command.permissions) {
      const authorPerms = message.channel.permissionsFor(message.author);
      if ((!authorPerms || !authorPerms.has(command.permissions)) && (!client.isDev(message.author.id))) {
        return message.channel.send("You do not have permisssion to issue this command."); // WIP
      }
    }

    if (command.args && !args.length) {
      return message.channel.send("No arguments were given."); // WIP
      // if (command.usage) message.channel.send(command.usageEmbed(prefix));
    }

    const now = Date.now();
    if (command.cooldowns.has(message.author.id)) {
      const expirationTime = command.cooldowns.get(message.author.id) + command.cooldown;
      if (expirationTime - now > 0) {
        const timeLeft = (expirationTime - now) / 1000;
        return message.channel.send(`Please wait ${timeLeft.toFixed(1)} more second(s) before using the \`${command.name}\` command again`) // WIP - embed
          .then(msg => setTimeout(() => msg.delete(), 7000));
      }
    }
    command.cooldowns.set(message.author.id, now);
    setTimeout(() => command.cooldowns.delete(message.author.id), command.cooldown);

    try {
      command.execute(message, args, client);
    }
    catch (error) {
      console.log(`The following error was caused by ${message.author.tag}:`);
      console.log(error);
    }
  }
}

module.exports = Message;