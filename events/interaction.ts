import { BaseInteraction } from 'discord.js';
import Bot from '../bot/bot';
import ClientEvent from '../bot/event';

export default class InteractionCreate extends ClientEvent {
  constructor() {
    super('interactionCreate', false);
  }

  async execute(client: Bot, interaction: BaseInteraction): Promise<void> {
    if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) return;

    const command = client.slashCommands.get(interaction.commandName);

    if (!command) return;

    if (interaction.isAutocomplete()) {
      try {
        await command.handleAutocomplete(interaction);
      }
      catch (error) {
        console.log(error);
      }
      return;
    }

    try {
      await command.execute(interaction);
    }
    catch (error) {
      console.log(error);
      await interaction.reply({ content: 'Encountered an error while running this command!', ephemeral: true });
    }

  }
}