import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, MessageReaction, SlashCommandBuilder, User } from 'discord.js';
import fetch from 'node-fetch';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';
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

export default class Trivia extends SlashCommand {
  private readonly serverTokens: Map<string, string>;
  private readonly triviaCategories!: Array<TriviaCategory>;

  constructor(client: Bot) {
    const data = new SlashCommandBuilder()
      .setName('trivia')
      .setDescription('Trivia command')
      .addSubcommand(cmd => cmd
        .setName('play')
        .setDescription('Play a game of trivia!')
        .addStringOption(option => option
          .setName('category')
          .setDescription('Get a question from a specific category')
        )
      )
      .addSubcommand(cmd => cmd
        .setName('categories')
        .setDescription('List all categories')
      );
    super(data as SlashCommandBuilder, client);

    this.serverTokens = new Map();
    this.loadTriviaCategories();
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subCommand = interaction.options.getSubcommand();
    if (subCommand === 'categories') {
      const categories: Array<string> = [];
      this.triviaCategories.forEach(category => categories.push(category.name));
      categories.sort();
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.BLUE)
        .setTitle('All categories')
        .addFields([
          { name: 'Here\'s a list of all categories:', value: categories.slice(0, Math.ceil(categories.length / 2)).join('\n'), inline: true },
          { name: '\u200b', value: categories.slice(Math.ceil(categories.length / 2), categories.length).join('\n'), inline: true }
        ]);
      interaction.reply({ embeds: [embed] });
      return;
    }

    const categoryName = interaction.options.getString('category');

    let categoryId = -1;
    if (categoryName !== null) {
      for (const arg of categoryName.split(/\s+/)) {
        let nameMatches = this.triviaCategories.filter(category => category.name.match(new RegExp(`\\b${arg}\\b`, 'gi')));
        if (!nameMatches.length) nameMatches = this.triviaCategories.filter(category => category.name.match(new RegExp(`\\b${arg}`, 'gi')));
        if (nameMatches.length) {
          const index = Math.floor(Math.random() * nameMatches.length); // Select a random category from the available matches
          categoryId = nameMatches[index].id;
          if (nameMatches.length === 1) break; // If we matched to exactly one category we can safely stop searching
        }
      }
    }
    
    let data: TriviaQuestion;
    try {
      data = await this.getQuestion(interaction, categoryId);
    }
    catch (error) {
      this.postErrorMessage(interaction, error instanceof Error ? error.message : 'Critical error');
      return;
    }

    const description = `${data.difficulty === 'easy' ? 'An' : 'A'} ${UtilityFunctions.capitalize(data.difficulty)} one from the category ${data.category}.`;
    
    let allAnswers: Array<string> = [];
    allAnswers.push(data.correct_answer);
    data.incorrect_answers.forEach((entry: string) => allAnswers.push(entry));
    allAnswers = allAnswers.length === 2 ? allAnswers.sort().reverse() : UtilityFunctions.shuffle(allAnswers) as Array<string>; // Sort if true/false, shuffle otherwise

    const allEmotes = ['🍎', '🍓', '🍐', '🍒', '🍇', '🥕', '🍊', '🍉', '🍋', '🍌', '🥥', '🥑', '🥦', '🌶️', '🌽', '🥝', '🧄', '🍍', '🥬'];
    const emotes = (UtilityFunctions.shuffle(allEmotes) as Array<string>).slice(0, allAnswers.length);

    const correctEmote = emotes[allAnswers.indexOf(data.correct_answer)];

    let answerString = '';
    allAnswers.forEach((ans, index) => answerString += `${emotes[index]} - ${ans}\n`);

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.member ? (interaction.member as GuildMember).displayName : interaction.user.username}, here's a question!`) // Respect nicknames on servers
      .setDescription(description)
      .addFields([
        { name: 'Question', value: this.cleanup(data.question) },
        { name: 'Choices', value: this.cleanup(answerString) }
      ])
      .setFooter({ text: 'Answer by reacting to the corresponding emote' })
      .setTimestamp();

    // Set embed color depending on difficulty
    switch (data.difficulty) {
      case 'easy':
        embed.setColor(this.client.config.colors.GREEN);
        break;
      case 'medium':
        embed.setColor(this.client.config.colors.ORANGE);
        break;
      case 'hard':
        embed.setColor(this.client.config.colors.RED);
        break; 
    }

    const triviaMessage = await interaction.reply({ embeds: [embed], fetchReply: true });
    emotes.forEach(emote => triviaMessage.react(emote));

    // Compact notation for function
    const filter = (reaction: MessageReaction, user: User) => user.id === interaction.user.id && emotes.includes(reaction.emoji.name!);

    const collector = triviaMessage.createReactionCollector({ filter, max: 1, time: 25000 });
    let reacted = false;
    const embedAns = new EmbedBuilder();

    collector.on('collect', reaction => {
      reacted = true;
      if (reaction.emoji.name === correctEmote) {
        embedAns
          .setColor(this.client.config.colors.GREEN)
          .setTitle('Correct answer!')
          .setDescription(`<@${interaction.user.id}>, you were correct! Congratulations!`);
      }
      else {
        embedAns
          .setColor(this.client.config.colors.RED)
          .setTitle('Incorrect')
          .setDescription(`Sorry, but that's incorrect. The right answer was ${this.cleanup(data.correct_answer)}.`)
          .setFooter({ text: 'Better luck next time!' });
      }
      interaction.followUp({ embeds: [embedAns] });
      return;
    });

    collector.on('end', () => {
      if (reacted) return;
      embedAns
        .setColor(this.client.config.colors.ORANGE)
        .setTitle('Time\'s up!')
        .setDescription(`You ran out of time! The correct answer was ${data.correct_answer}.`);
      interaction.followUp({ embeds: [embedAns] });
      return;
    });
  }

  private postErrorMessage(interaction: ChatInputCommandInteraction, errorMessage: string): void {
    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.RED)
      .setTitle('Error')
      .setDescription('An error was encountered')
      .addFields({ name: 'Error message:', value: `\`${errorMessage}\`` });
    interaction.reply({ embeds: [embed] });
  }

  private async getQuestion(interaction: ChatInputCommandInteraction, categoryId: number): Promise <TriviaQuestion> {
    const token = this.serverTokens.get(interaction.guild ? interaction.guild.id : interaction.user.id);
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
          try { await this.resetToken(interaction) }
          catch (error) { throw error }

          try { return await this.getQuestion(interaction, categoryId) }
          catch (error) { throw error }
        }
        default: // Case 3
      }
    }

    try { await this.generateNewToken(interaction) }
    catch (error) { throw error }

    try { return await this.getQuestion(interaction, categoryId) }
    catch (error) { throw error }
  }

  private async generateNewToken(interaction: ChatInputCommandInteraction): Promise<void> {
    const response = await fetch('https://opentdb.com/api_token.php?command=request');
    const data = await response.json();

    if (data.response_code === 0) this.serverTokens.set(interaction.guild ? interaction.guild.id : interaction.user.id, data.token);
    else throw new Error(`Could not generate new token.\nResponse code ${data.response_code}`);
  }

  private async resetToken(interaction: ChatInputCommandInteraction): Promise<void> {
    const token = this.serverTokens.get(interaction.guild ? interaction.guild.id : interaction.user.id);
    if (token) {
      const respose = await fetch(`https://opentdb.com/api_token.php?command=reset&token=${token}`);
      const data = await respose.json();
      if (data.response_code !== 0) throw new Error(`Could not reset token.\nResponse code ${data.response_code}`);
    }
    else throw new Error('No token found.');
  }

  private async loadTriviaCategories(): Promise<void> {
    interface ResponseData {
      trivia_categories: Array<TriviaCategory>;
    }
    const response = await fetch('https://opentdb.com/api_category.php');
    const data: ResponseData = await response.json();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.triviaCategories = data.trivia_categories;
  }

  private cleanup(str: string): string {  
    // Keep on adding to this list as you find more errors
    const allReplacements: Array<[RegExp, string]> = [[/&#039;/g, '\''], [/&quot;/g, '\''], [/&micro;/g, 'µ'],
      [/&Agrave;/g, 'À'], [/&Aacute;/g, 'Á'], [/&Acirc;/g, 'Â'], [/&Atilde;/g, 'Ã'], [/&Auml;/g, 'Ä'], [/&Aring;/g, 'Å'],
      [/&agrave;/g, 'à'], [/&aacute;/g, 'á'], [/&acirc;/g, 'â'], [/&atilde;/g, 'ã'], [/&auml;/g, 'ä'], [/&aring;/g, 'å'],
      [/&AElig;/g, 'Æ'], [/&aelig;/g, 'æ'], [/&szlig;/g, 'ß'], [/&Ccedil;/g, 'Ç'], [/&ccedil;/g, 'ç'], [/&Egrave;/g, 'È'],
      [/&Eacute;/g, 'É'], [/&Ecirc;/g, 'Ê'], [/&Euml;/g, 'Ë'], [/&egrave;/g, 'è'], [/&eacute;/g, 'é'], [/&ecirc;/g, 'ê'],
      [/&euml;/g, 'ë'], [/&#131;/g, 'ƒ'], [/&Igrave;/g, 'Ì'], [/&Iacute;/g, 'Í'], [/&Icirc;/g, 'Î'], [/&Iuml;/g, 'Ï'],
      [/&igrave;/g, 'ì'], [/&iacute;/g, 'í'], [/&icirc;/g, 'î'], [/&iuml;/g, 'ï'], [/&Ntilde;/g, 'Ñ'], [/&ntilde;/g, 'ñ'],
      [/&Ograve;/g, 'Ò'], [/&Oacute;/g, 'Ó'], [/&Ocirc;/g, 'Ô'], [/&Otilde;/g, 'Õ'], [/&Ouml;/g, 'Ö'], [/&ograve;/g, 'ò'],
      [/&oacute;/g, 'ó'], [/&ocirc;/g, 'ô'], [/&otilde;/g, 'õ'], [/&ouml;/g, 'ö'], [/&Oslash;/g, 'Ø'], [/&oslash;/g, 'ø'],
      [/&#140;/g, 'Œ'], [/&#156;/g, 'œ'], [/&#138;/g, 'Š'], [/&#154;/g, 'š'], [/&Ugrave;/g, 'Ù'], [/&Uacute;/g, 'Ú'],
      [/&Ucirc;/g, 'Û'], [/&Uuml;/g, 'Ü'], [/&ugrave;/g, 'ù'], [/&uacute;/g, 'ú'], [/&ucirc;/g, 'û'], [/&uuml;/g, 'ü'],
      [/&#181;/g, 'µ'], [/&Yacute;/g, 'Ý'], [/&#159;/g, 'Ÿ'], [/&yacute;/g, 'ý'], [/&yuml;/g, 'ÿ'], [/&deg;/g, '°'],
      [/&amp;/g, '&'], [/&ldquo;/g, '“'], [/&rdquo;/g, '”'], [/&reg;/g, '®'], [/&trade;/g, '™'], [/&lt;/g, '<'],
      [/&gt;/g, '>'], [/&le;/g, '≤'], [/&ge;/g, '≥'], [/&pi;/g, 'π']];
  
    allReplacements.forEach(pair => str = str.replace(pair[0], pair[1]));
    return str;
  }
}