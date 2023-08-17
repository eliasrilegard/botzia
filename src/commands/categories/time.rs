use serenity::async_trait;
use serenity::builder::CreateApplicationCommand;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;

use crate::commands::{time, SlashCommand};
use crate::database::Database;
use crate::interaction::InteractionCustomGet;
use crate::Result;

#[derive(Default)]
pub struct Time;

#[async_trait]
impl SlashCommand for Time {
  fn register<'a>(&self, command: &'a mut CreateApplicationCommand) -> &'a mut CreateApplicationCommand {
    for (_, subcommand) in time::commands() {
      command.create_option(|option| subcommand.register(option));
    }
    command.name("time").description("dynamic date-time display commands")
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, db: &Database) -> Result<()> {
    let subcommands = time::commands();

    let subcommand_name = if let Some(group) = interaction.get_subcommand_group() {
      group.name
    } else {
      interaction.get_subcommand().unwrap().name
    };

    let subcommand = &subcommands.iter().find(|(name, _)| name == &subcommand_name).unwrap().1;
    subcommand.execute(ctx, interaction, db).await?;

    Ok(())
  }
}
