const Command = require('../../bot/command.js');
const fs = require('fs');
const { MessageEmbed } = require('discord.js');

class Reload extends Command {
  constructor() {
    super('reload', 'Reloads a command', '[command name] OR -b, --build [command folder] [file name]', { devOnly: true });
  }

  async execute(message, args, client) {
    const commandsDir = __dirname.slice(0, -4);

    // Build commands without rebooting
    if (['-b', '--build'].includes(args[0])) {
      const commandFolder = args[1];
      const fileName = args[2];
      const embed = new MessageEmbed();
      try {
        const commandClass = require(`${commandsDir}/${commandFolder}/${fileName}.js`);
        const command = new commandClass();
        client.commands.set(command.name, command);
        embed
          .setColor('00cc00')
          .setTitle('Command added')
          .setDescription(`Successfully built the command \`commands/${commandFolder}/${fileName}.js\`.`);
      }
      catch (error) {
        embed
          .setColor('cc0000')
          .setTitle('No such file')
          .setDescription(`The file \`commands/${commandFolder}/${fileName}.js\` couldn't be located.`)
          .addField('Error message', error.message);
      }
      return message.channel.send({ embeds: [embed] });
    }

    // Get command name or alias
    const commandName = args[0].toLowerCase();
    const command = client.commands.get(commandName)
      || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) {
      const embed = new MessageEmbed()
        .setColor('cc0000')
        .setTitle('Comand not found')
        .setDescription(`There is no command with name or alias \`${commandName}\`.`);
      return message.channel.send({ embeds: [embed] });
    }

    const commandFolders = fs.readdirSync(commandsDir);
    const folderName = commandFolders.find(folder => fs.readdirSync(`${commandsDir}/${folder}`).includes(`${command.name}.js`));

    // Delete
    delete require.cache[require.resolve(`${commandsDir}/${folderName}/${command.name}.js`)];

    // Re-require the file
    try {
      const newCommandClass = require(`${commandsDir}/${folderName}/${command.name}.js`);
      const newCommand = new newCommandClass();
      client.commands.set(newCommand.name, newCommand);

      const embed = new MessageEmbed()
        .setColor('00cc00')
        .setTitle('Command reloaded')
        .setDescription(`Command \`${command.name}\` was reloaded.`);
      message.channel.send({ embeds: [embed] });
    }
    catch (error) {
      console.log(error);
      const embed = new MessageEmbed()
        .setColor('cc0000')
        .setTitle('Error')
        .setDescription(`Command \`${command.name}\` could not be reloaded.`)
        .addField('Error message:', `\`${error.message}\``);
      message.channel.send({ embeds: [embed] });
    }
  }
}

module.exports = Reload;