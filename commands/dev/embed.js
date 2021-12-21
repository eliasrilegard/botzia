const Command = require('../../bot/command.js');
const { MessageEmbed } = require('discord.js');

class Embed extends Command {
  constructor() {
    super('embed', 'Sends a predefined embed message', '<usage>', { args: false });
  }

  execute(message) {
    const exampleEmbed = new MessageEmbed()
      .setColor('#0099ff')
      .setTitle('Some title')
      .setURL('https://discord.js.org/')
      .setAuthor('Some name', 'https://i.imgur.com/AfFp7pu.png', 'https://discord.js.org')
      .setDescription('Some description here')
      .setThumbnail('https://i.imgur.com/AfFp7pu.png')
      .addFields(
        { name: 'Regular field title', value: 'Some value here' },
        { name: '\u200B', value: '\u200B' },
        { name: 'Inline field title', value: 'Some value here', inline: true },
        { name: 'Inline field title', value: 'Some value here', inline: true },
      )
      .addField('Inline field title', 'Some value here', true)
      .setImage('https://i.imgur.com/AfFp7pu.png')
      .setTimestamp()
      .setFooter('Some footer text here', 'https://i.imgur.com/AfFp7pu.png');

    message.channel.send({ embeds: [exampleEmbed] });
  }
}

module.exports = Embed;