const Command = require('../../bot/command.js');
const fs = require('fs');
const { MessageEmbed } = require('discord.js');

class Reload extends Command {
  constructor() {
    super('reload', 'Reloads a command', '<command name>', { devOnly: true });
  }

  execute(message, args, client) {
    // Get command name or alias
    const commandName = args[0].toLowerCase();
    const command = client.commands.get(commandName)
      || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) {
      const embed = new MessageEmbed()
        .setColor("cc0000")
        .setTitle("Comand not found")
        .setDescription(`There is no command with name or alias \`${commandName}\`.`);
      return message.channel.send({ embeds: [embed] });
    }

    const commandsDir = __dirname.slice(0,-4);
    const commandFolders = fs.readdirSync(commandsDir);
    const folderName = commandFolders.find(folder => fs.readdirSync(`${commandsDir}/${folder}`).includes(`${commandName}.js`));

    // Delete
    delete require.cache[require.resolve(`${commandsDir}/${folderName}/${command.name}.js`)];

    // Re-require the file
    try {
      const newCommandClass = require(`${commandsDir}/${folderName}/${command.name}.js`);
      const newCommand = new newCommandClass();
      client.commands.set(newCommand.name, newCommand);

      const embed = new MessageEmbed()
        .setColor("00cc00")
        .setTitle("Command reloaded")
        .setDescription(`Command \`${command.name}\` was reloaded.`);
      message.channel.send({ embeds: [embed] });
    }
    catch (error) {
      console.log(error);
      const embed = new MessageEmbed()
        .setColor("cc0000")
        .setTitle("Error")
        .setDescription(`Command \`${command.name}\` could not be reloaded.`)
        .addField("Error message:", `\`${error.message}\``);
      message.channel.send({ embeds: [embed] });
    }
  }
}

module.exports = Reload;