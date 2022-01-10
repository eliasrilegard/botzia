const Command = require('../../bot/command.js');
const { MessageEmbed } = require('discord.js');

class Poll extends Command {
  constructor() {
    super('poll', 'Make a poll about something!', '[Question]; [Option1]; [Option2] ...', { guildOnly: true });
  }

  async execute(message, args, client) {
    const pollOptions = args.join(' ').split(';').map(str => str.trim());
    const question = pollOptions.shift();

    if (pollOptions.length > 20 || pollOptions.length < 2) {
      const embed = new MessageEmbed()
        .setColor('cc0000')
        .setTitle('Check arguments')
        .setDescription('A poll needs at least 2 and a most 20 options.')
        .addField('Command usage:', this.howTo(await client.prefix(message)/*prefix*/, true));
      return message.channel.send({ embeds: [embed] });
    }

    const allEmotes = ['🍎', '🍓', '🍐', '🍒', '🍇', '🥕', '🍊', '🍉', '🍋', '🍌', '🥥', '🥑', '🥦', '🌶️', '🌽', '🥝', '🧄', '🍍', '🥬', '<:kekw:743962015411732510>'];

    const emotes = this.shuffle(allEmotes).slice(0, pollOptions.length);

    let choicesString = '';
    pollOptions.forEach((option, index) => choicesString += `${emotes[index]} - ${option}\n`);

    const embed = new MessageEmbed()
      .setColor(message.member.displayHexColor)
      .setAuthor(`${message.member.displayName} created a poll`, message.member.displayAvatarURL())
      .setTitle(question)
      .addField('Choices', choicesString.trim())
      .setFooter({ text: 'React with your vote below!' })
      .setTimestamp();
    
    const pollMessage = await message.channel.send({ embeds: [embed] });
    emotes.forEach(emote => pollMessage.react(emote));
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }
}

module.exports = Poll;