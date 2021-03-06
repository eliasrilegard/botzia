import { Message, MessageEmbed, MessageReaction, User } from 'discord.js';
import fetch from 'node-fetch';
import Bot from '../../bot/bot';
import Command from '../../bot/command';
import UtilityFunctions from '../../utils/utilities';

interface TriviaCategory {
  id: number;
  name: string;
}

interface TriviaQuestion {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: Array<string>;
}

export default class Trivia extends Command {
  private readonly serverTokens: Map<string, string>;
  private triviaCategories: Array<TriviaCategory>;

  constructor() {
    super(
      'trivia',
      'Play a game of trivia!',
      ['(category)', '--categories'],
      { args: false }
    );
    this.serverTokens = new Map();
    this.loadTriviaCategories();
  }
  
  async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    if (args[0] === '--reset' && args.length === 1) {
      const token = this.serverTokens.get(message.guildId);
      // const token = client.tokens.get('OTDB');
      if (token) {
        try { return this.resetToken(message, client) }
        catch (error) { this.postErrorMessage(message, client, error.message) }
      }
      else {
        try { return this.generateNewToken(message) }
        catch (error) { this.postErrorMessage(message, client, error.message) }
      }
    }
    else if (args[0] === '--categories' && args.length === 1) {
      const categories: Array<string> = [];
      this.triviaCategories.forEach(category => categories.push(category.name));
      categories.sort();
      const embed = new MessageEmbed()
        .setColor(client.config.colors.BLUE)
        .setTitle('All categories')
        .addField('Here\'s a list of all categories:', categories.slice(0, Math.ceil(categories.length / 2)).join('\n'), true)
        .addField('\u200b', categories.slice(Math.ceil(categories.length / 2), categories.length).join('\n'), true);
      message.channel.send({ embeds: [embed] });
      return;
    }

    let categoryId = -1;
    for (const arg of args) {
      let nameMatches = this.triviaCategories.filter(category => category.name.match(new RegExp(`\\b${arg}\\b`, 'gi')));
      if (!nameMatches.length) nameMatches = this.triviaCategories.filter(category => category.name.match(new RegExp(`\\b${arg}`, 'gi')));
      if (nameMatches.length) {
        const index = Math.floor(Math.random() * nameMatches.length); // Select a random category from the avalible matches
        categoryId = nameMatches[index].id;
        if (nameMatches.length === 1) break; // If we matched to exactly one category we can safely stop searching
      }
    }
    
    let data: TriviaQuestion;
    try {
      data = await this.getQuestion(message, client, categoryId);
    }
    catch (error) {
      this.postErrorMessage(message, client, error.message);
      return;
    }

    const description = `${data.difficulty === 'easy' ? 'An' : 'A'} ${UtilityFunctions.capitalize(data.difficulty)} one from the category ${data.category}.`;
    
    let allAnswers: Array<string> = [];
    allAnswers.push(data.correct_answer);
    data.incorrect_answers.forEach((entry: string) => allAnswers.push(entry));
    allAnswers = allAnswers.length === 2 ? allAnswers.sort().reverse() : UtilityFunctions.shuffle(allAnswers) as Array<string>; // Sort if true/false, shuffle otherwise

    const allEmotes = ['????', '????', '????', '????', '????', '????', '????', '????', '????', '????', '????', '????', '????', '???????', '????', '????', '????', '????', '????'];
    const emotes = (UtilityFunctions.shuffle(allEmotes) as Array<string>).slice(0, allAnswers.length);

    const correctEmote = emotes[allAnswers.indexOf(data.correct_answer)];

    let answerString = '';
    allAnswers.forEach((ans, index) => answerString += `${emotes[index]} - ${ans}\n`);

    const embed = new MessageEmbed()
      .setTitle(`${message.member ? message.member.displayName : message.author.username}, here's a question!`) // Respect nicknames on servers
      .setDescription(description)
      .addField('Question', this.cleanup(data.question))
      .addField('Choices', this.cleanup(answerString))
      .setFooter({ text: 'Answer by reacting to the corresponding emote' })
      .setTimestamp();

    // Set embed color depending on difficulty
    switch (data.difficulty) {
      case 'easy':
        embed.setColor(client.config.colors.GREEN);
        break;
      case 'medium':
        embed.setColor(client.config.colors.ORANGE);
        break;
      case 'hard':
        embed.setColor(client.config.colors.RED);
        break; 
    }

    const triviaMessage = await message.channel.send({ embeds: [embed] });
    emotes.forEach(emote => triviaMessage.react(emote));

    // Compact notation for function
    const filter = (reaction: MessageReaction, user: User) => user.id === message.author.id && emotes.includes(reaction.emoji.name);

    const collector = triviaMessage.createReactionCollector({ filter, max: 1, time: 25000 });
    let reacted = false;
    const embedAns = new MessageEmbed();

    collector.on('collect', reaction => {
      reacted = true;
      if (reaction.emoji.name === correctEmote) {
        embedAns
          .setColor(client.config.colors.GREEN)
          .setTitle('Correct answer!')
          .setDescription(`<@${message.author.id}>, you were correct! Congratulations!`);
      }
      else {
        embedAns
          .setColor(client.config.colors.RED)
          .setTitle('Incorrect')
          .setDescription(`Sorry, but that's incorrect. The right answer was ${this.cleanup(data.correct_answer)}.`)
          .setFooter({ text: 'Better luck next time!' });
      }
      return message.channel.send({ embeds: [embedAns] });
    });

    collector.on('end', () => {
      if (reacted) return;
      embedAns
        .setColor(client.config.colors.ORANGE)
        .setTitle('Time\'s up!')
        .setDescription(`You ran out of time! The correct answer was ${data.correct_answer}.`);
      return message.channel.send({ embeds: [embedAns] });
    });
  }

  private postErrorMessage(message: Message, client: Bot, errorMessage: string): void {
    const embed = new MessageEmbed()
      .setColor(client.config.colors.RED)
      .setTitle('Error')
      .setDescription('An error was encountered')
      .addField('Error message:', `\`${errorMessage}\``);
    message.channel.send({ embeds: [embed] });
  }

  private async getQuestion(message: Message, client: Bot, categoryId: number): Promise <TriviaQuestion> {
    const token = this.serverTokens.get(message.guildId);
    if (token) {
      let URL = 'https://opentdb.com/api.php?amount=1';
      if (categoryId !== -1) URL += `&category=${categoryId}`;
      URL += `&token=${token}`;

      const response = await fetch(URL);
      const data = await response.json();
      switch (data.response_code) {
        case 0: return data.results[0];
        case 1: throw new Error(`Could not get question.\nResponse code: ${data.response_code}`);
        case 2: throw new Error(`Invalid argument.\nCategory ID: \`${categoryId}\``);
        case 4: {
          try { await this.resetToken(message, client) }
          catch (error) { throw error }

          try { return await this.getQuestion(message, client, categoryId) }
          catch (error) { throw error }
        }
        default: // Case 3
      }
    }

    try { await this.generateNewToken(message) }
    catch (error) { throw error }

    try { return await this.getQuestion(message, client, categoryId) }
    catch (error) { throw error }
  }

  private async generateNewToken(message: Message): Promise<void> {
    const response = await fetch('https://opentdb.com/api_token.php?command=request');
    const data = await response.json();

    if (data.response_code === 0) this.serverTokens.set(message.guildId, data.token);
    else throw new Error(`Could not generate new token.\nResponse code ${data.response_code}`);
  }

  private async resetToken(message: Message, client: Bot): Promise<void> {
    const token = this.serverTokens.get(message.guildId);
    if (token) {
      const respose = await fetch(`https://opentdb.com/api_token.php?command=reset&token=${token}`);
      const data = await respose.json();
      if (data.response_code === 0) {
        const embed = new MessageEmbed()
          .setColor(client.config.colors.GREEN)
          .setTitle('Token reset');
        message.channel.send({ embeds: [embed] });
      }
      else throw new Error(`Could not reset token.\nResponse code ${data.response_code}`);
    }
    else throw new Error('No token found.');
  }

  private async loadTriviaCategories(): Promise<void> {
    interface ResponseData {
      trivia_categories: Array<TriviaCategory>;
    }
    const response = await fetch('https://opentdb.com/api_category.php');
    const data: ResponseData = await response.json();
    this.triviaCategories = data.trivia_categories;
  }

  private cleanup(str: string): string {  
    // Keep on adding to this list as you find more errors
    const allReplacements: Array<[RegExp, string]> = [[/&#039;/g, '\''], [/&quot;/g, '\''], [/&micro;/g, '??'],
      [/&Agrave;/g, '??'], [/&Aacute;/g, '??'], [/&Acirc;/g, '??'], [/&Atilde;/g, '??'], [/&Auml;/g, '??'], [/&Aring;/g, '??'],
      [/&agrave;/g, '??'], [/&aacute;/g, '??'], [/&acirc;/g, '??'], [/&atilde;/g, '??'], [/&auml;/g, '??'], [/&aring;/g, '??'],
      [/&AElig;/g, '??'], [/&aelig;/g, '??'], [/&szlig;/g, '??'], [/&Ccedil;/g, '??'], [/&ccedil;/g, '??'], [/&Egrave;/g, '??'],
      [/&Eacute;/g, '??'], [/&Ecirc;/g, '??'], [/&Euml;/g, '??'], [/&egrave;/g, '??'], [/&eacute;/g, '??'], [/&ecirc;/g, '??'],
      [/&euml;/g, '??'], [/&#131;/g, '??'], [/&Igrave;/g, '??'], [/&Iacute;/g, '??'], [/&Icirc;/g, '??'], [/&Iuml;/g, '??'],
      [/&igrave;/g, '??'], [/&iacute;/g, '??'], [/&icirc;/g, '??'], [/&iuml;/g, '??'], [/&Ntilde;/g, '??'], [/&ntilde;/g, '??'],
      [/&Ograve;/g, '??'], [/&Oacute;/g, '??'], [/&Ocirc;/g, '??'], [/&Otilde;/g, '??'], [/&Ouml;/g, '??'], [/&ograve;/g, '??'],
      [/&oacute;/g, '??'], [/&ocirc;/g, '??'], [/&otilde;/g, '??'], [/&ouml;/g, '??'], [/&Oslash;/g, '??'], [/&oslash;/g, '??'],
      [/&#140;/g, '??'], [/&#156;/g, '??'], [/&#138;/g, '??'], [/&#154;/g, '??'], [/&Ugrave;/g, '??'], [/&Uacute;/g, '??'],
      [/&Ucirc;/g, '??'], [/&Uuml;/g, '??'], [/&ugrave;/g, '??'], [/&uacute;/g, '??'], [/&ucirc;/g, '??'], [/&uuml;/g, '??'],
      [/&#181;/g, '??'], [/&Yacute;/g, '??'], [/&#159;/g, '??'], [/&yacute;/g, '??'], [/&yuml;/g, '??'], [/&deg;/g, '??'],
      [/&amp;/g, '&'], [/&ldquo;/g, '???'], [/&rdquo;/g, '???'], [/&reg;/g, '??'], [/&trade;/g, '???'], [/&lt;/g, '<'],
      [/&gt;/g, '>'], [/&le;/g, '???'], [/&ge;/g, '???'], [/&pi;/g, '??']];
  
    allReplacements.forEach(pair => str = str.replace(pair[0], pair[1]));
    return str;
  }
}