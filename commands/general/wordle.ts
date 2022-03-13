import { Message, MessageEmbed } from 'discord.js';
import { readFileSync } from 'fs';
import Command from '../../bot/command';

class Wordle extends Command {
  public constructor() {
    super(
      'wordle',
      'Wordle helper',
      ['[placed letters] (unplaced letters) (wrong letters)']
    );
  }

  public async execute(message: Message, args: Array<string>): Promise<void> {
    let words = readFileSync(__dirname.slice(0, -21).concat('database/wordle/allowed_real.txt')).toString().split('\n');

    const placed = args[0].toLowerCase(); // Use - to denote empty
    if (placed.length !== 5) {
      const embed = new MessageEmbed()
        .setColor('#cc0000')
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
      const reIncorrect = new RegExp(`[${args[2].toLowerCase()}]`);
      words = words.filter(word => !reIncorrect.test(word));
    }

    const rePlaced = new RegExp(`${placed.replace(/-/g, '.')}`);
    words = words.filter(word => rePlaced.test(word));

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
        const embed = new MessageEmbed().setColor('#00cc00').setDescription('**Matching words**');
        embedContent.forEach(wordArr => {
          if (wordArr.length > 0) embed.addField('\u200b', wordArr.join('\n'), true);
        });
        return embed;
      });

    if (embeds.length === 1) message.channel.send({ embeds: [embeds[0]] });
    else this.sendMenu(message, embeds);
  }
}

export default Wordle;