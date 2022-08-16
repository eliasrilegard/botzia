import { config } from 'dotenv'; config();
import { REST, RESTPostAPIApplicationCommandsJSONBody, Routes, SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import SlashCommand from './bot/slash';
import UtilityFunctions from './utils/utilities';

const commands: Array<RESTPostAPIApplicationCommandsJSONBody> = [];
const commandFiles = UtilityFunctions.getFiles(__dirname.concat('/slash'));

const clientId = '780420556637339648';

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  console.log('Building command data...');

  const allCommands: Array<SlashCommand> = [];
  for await (const file of commandFiles) {
    const { default: CommandClass } = await import(file);
    const command: SlashCommand = new CommandClass();
    allCommands.push(command);
  }

  for (const command of allCommands) {
    if (command.belongsTo) continue;
    const commandData = command.data as SlashCommandBuilder;
    const subCommands = allCommands.filter(cmd => cmd.belongsTo === commandData.name);
    // This will be empty if command isn't a category
    for (const subCommand of subCommands) {
      const subCommandData = subCommand.data as SlashCommandSubcommandBuilder;
      commandData.addSubcommand(subCommandData);
    }
    commands.push(commandData.toJSON());
  }

  console.log('Started refreshing application commands.');

  try {
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );

    console.log('Successfully refreshed application commands!');
  }
  catch (error) {
    console.error(error);
  }
})();
