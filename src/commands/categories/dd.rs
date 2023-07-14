use serenity::async_trait;
use serenity::builder::CreateApplicationCommand;
use serenity::model::application::interaction::autocomplete::AutocompleteInteraction;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;

use crate::commands::dd;
use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::AutocompleteCustomGet;
use crate::interaction::InteractionCustomGet;
use crate::Result;

pub struct DD;

impl Default for DD {
  fn default() -> Self {
    Self
  }
}

#[async_trait]
impl SlashCommand for DD {
  fn register<'a>(&self, command: &'a mut CreateApplicationCommand) ->  &'a mut CreateApplicationCommand {
    let subcommands = dd::commands();
    for (_, subcommand) in subcommands {
      command.create_option(|option| subcommand.register(option));
    }

    command
      .name("dd")
      .description("Dungeon Defenders")
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, db: &Database) -> Result<()> {
    let subcommands = dd::commands();

    let subcommand_name = interaction.get_subcommand().unwrap().name;
    
    let (_, subcommand) = subcommands.iter().find(|pair| pair.0 == subcommand_name).unwrap();
    subcommand.execute(ctx, interaction, db).await?;
    
    Ok(())
  }

  // Needs to be implemented for any category command that has any subcommand with autocomplete enabled
  async fn autocomplete(&self, ctx: &Context, interaction: &AutocompleteInteraction, db: &Database) -> Result<()> {
    let subcommands = dd::commands();

    let subcommand_name = interaction.get_subcommand().unwrap().name;
    
    let (_, subcommand) = subcommands.iter().find(|pair| pair.0 == subcommand_name).unwrap();
    subcommand.autocomplete(ctx, interaction, db).await?;
    
    Ok(())
  }
}