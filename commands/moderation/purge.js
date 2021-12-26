const Command = require('../../bot/command.js');
const { MessageEmbed } = require('discord.js');

class Purge extends Command {
  constructor() {
    super('purge', 'Clears a specified number of messages.', '[# of messages to purge]', { permissions: 'MANAGE_MESSAGES' });
  }

  async execute(message, args) {
    const count = parseInt(args[0]) + 1;

    if (count < 2 || count > 100 || isNaN(count)) {
      const embed = new MessageEmbed()
        .setColor('cc0000')
        .setTitle('Invalid argument')
        .setDescription('Specify a number between 1 and 1000.');
      return message.channel.send(embed);
    }

    await message.channel.bulkDelete(count)
      .catch(error => {
        console.log(error);
        const embed = new MessageEmbed()
          .setColor('cc0000')
          .setTitle('Error')
          .setDescription('An error was encountered while trying to delete messages.');
        message.channel.send(embed);
      });
    const successEmbed = new MessageEmbed()
      .setColor('00cc00')
      .setTitle('Success')
      .setDescription(`Successfully deleted ${count} messages.`);
    const successMsg = await message.channel.send({ embeds: [successEmbed] });
    setTimeout(() => successMsg.delete(), 7000);
  }
}

module.exports = Purge;