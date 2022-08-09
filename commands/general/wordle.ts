import { Message, MessageEmbed } from 'discord.js';
import { readFileSync } from 'fs';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

export default class Wordle extends Command {
  constructor(client: Bot) {
    super(
      client,
      'wordle',
      'Wordle helper',
      [
        '[placed letters] (unplaced letters) (wrong letters)',
        '[placed letters] \`none\` (wrong letters)'
      ]
    );
  }

  async execute(message: Message, args: Array<string>): Promise<void> {
    let words = readFileSync(__dirname.slice(0, -21).concat('database/wordle/allowed_real.txt')).toString().split('\n');

    const placed = args[0].toLowerCase(); // Use - to denote empty
    if (placed.length !== 5) {
      const embed = new MessageEmbed()
        .setColor(this.client.config.colors.RED)
        .setTitle('Incorrect length')
        .setDescription('Placed letters argument must be exactly 5.')
        .addField('Tip', 'Use \'-\' to denote empty spots.');
      message.channel.send({ embeds: [embed] });
      return;
    }

    if (args[1] && args[1].toLowerCase() !== 'none') { // Pass 'none' to skip this check (ie no yellow letters)
      const rePrep = args[1].split('').map(c => `(?=.*${c.toLowerCase()})`).join('').concat('.+');
      const reUnplaced = new RegExp(`${rePrep}`);
      words = words.filter(word => reUnplaced.test(word));
    }

    if (args[2]) {
      if (args[1].toLowerCase() !== 'none' && [...args[1]].some(c => args[2].includes(c))) {
        const embed = new MessageEmbed()
          .setColor(this.client.config.colors.RED)
          .setTitle('Invalid arguments')
          .setDescription('Argument 2 and 3 must not share any characters.');
        message.channel.send({ embeds: [embed] });
        return;
      }

      const reIncorrect = new RegExp(`[${args[2].toLowerCase()}]`);
      words = words.filter(word => !reIncorrect.test(word));
    }

    const rePlaced = new RegExp(`${placed.replace(/-/g, '.')}`);
    words = words.filter(word => rePlaced.test(word));

    if (words.length === 0) {
      const embed = new MessageEmbed()
        .setColor(this.client.config.colors.ORANGE)
        .setTitle('No words found')
        .setDescription('Did you enter all arguments correctly?');
      message.channel.send({ embeds: [embed] });
      return;
    }

    const wordsPerColumn = 20;
    const columnNumbers = 3;

    const embeds = words
      .reduce( // Chunk word list into triads of arrays, each inner array has 20 words
        (result: Array<Array<Array<string>>>, word, index) => {
          const embedIndex = Math.floor(index / (wordsPerColumn * columnNumbers));
          const columnIndex = Math.floor(index / wordsPerColumn) % columnNumbers;
          result[embedIndex][columnIndex].push(word);
          return result;
        },
        Array.from( // [ [ [], [], [] ], [ [], [], [] ], ...]
          { length: Math.ceil(words.length / (wordsPerColumn * columnNumbers)) },
          () => Array.from({ length: 3 }, () => [])
        )
      )
      .map((embedContent: Array<Array<string>>) => { // Map each chunk of word arrays into an embed message
        const embed = new MessageEmbed().setColor(this.client.config.colors.GREEN).setDescription('**Matching words**');
        embedContent.forEach(wordArr => {
          if (wordArr.length > 0) embed.addField('\u200b', wordArr.join('\n'), true);
        });
        return embed;
      });

    if (embeds.length === 1) {
      const wordMessage = await message.channel.send({ embeds: [embeds[0]] });
      setTimeout(() => wordMessage.delete(), 120000);
    }
    else {
      const pager = this.sendMenu(message, embeds);
      setTimeout(() => pager.delete(), 120000);
    }
    setTimeout(() => message.delete(), 120000);
  }
}