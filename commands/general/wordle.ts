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

    const wordsPerPage = 20;
    const columnNumbers = 3;

    const embeds = words
      .reduce((result: Array<Array<string>>, word, index) => { // Chunk all words into smaller arrays
        const chunkIndex = Math.floor(index / wordsPerPage);
        if (!result[chunkIndex]) result[chunkIndex] = [];
        result[chunkIndex].push(word);
        return result;
      }, [])
      .reduce((result: Array<Array<Array<string>>>, chunk, index) => { // Chunk those arrays into pairs
        const chunkIndex = Math.floor(index / columnNumbers);
        if (!result[chunkIndex]) result[chunkIndex] = [];
        result[chunkIndex].push(chunk);
        return result;
      }, [])
      .map(chunk => { // Map each pair of word arrays into an embed message with two columns
        const embed = new MessageEmbed().setColor('#00cc00').setDescription('**Matching words**');
        chunk.forEach(wordArr => {
          embed.addField('\u200b', wordArr.join('\n'), true);
        });
        return embed;
      });

    if (embeds.length === 1) message.channel.send({ embeds: [embeds[0]] });
    else this.sendMenu(message, embeds);
  }
}

export default Wordle;