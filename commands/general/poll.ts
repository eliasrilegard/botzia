import { Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';
import Utils from '../../bot/utils';

export default class Poll extends Command {
  constructor() {
    super(
      'poll',
      'Make a poll about something!',
      ['[question]; [option 1]; [option 2] ...'],
      { guildOnly: true }
    );
  }

  async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    const pollOptions = args.join(' ').split(';').map(str => str.trim());
    const question = pollOptions.shift();

    if (pollOptions.length > 20 || pollOptions.length < 2) {
      const embed = new MessageEmbed()
        .setColor(client.config.colors.RED)
        .setTitle('Check arguments')
        .setDescription('A poll needs at least 2 and a most 20 options.')
        .addField('Command usage:', this.howTo(await client.prefix(message), true));
      message.channel.send({ embeds: [embed] });
      return;
    }

    const allEmotes = ['🍎', '🍓', '🍐', '🍒', '🍇', '🥕', '🍊', '🍉', '🍋', '🍌', '🥥', '🥑', '🥦', '🌶️', '🌽', '🥝', '🧄', '🍍', '🥬', '<:kekw:743962015411732510>'];

    const emotes = (Utils.shuffle(allEmotes) as Array<string>).slice(0, pollOptions.length);

    let choicesString = '';
    pollOptions.forEach((option, index) => choicesString += `${emotes[index]} - ${option}\n`);

    const embed = new MessageEmbed()
      .setColor(message.member.displayHexColor)
      .setAuthor({ name: `${message.member.displayName} created a poll`, iconURL: message.member.displayAvatarURL() })
      .setTitle(question)
      .addField('Choices', choicesString.trim())
      .setFooter({ text: 'React with your vote below!' })
      .setTimestamp();
    
    const pollMessage = await message.channel.send({ embeds: [embed] });
    emotes.forEach(emote => pollMessage.react(emote));
  }
}