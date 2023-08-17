use serenity::async_trait;
use serenity::builder::CreateApplicationCommand;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;

use crate::commands::{probability, SlashCommand};
use crate::database::Database;
use crate::interaction::InteractionCustomGet;
use crate::Result;

#[derive(Default)]
pub struct Probability;

#[async_trait]
impl SlashCommand for Probability {
  fn register<'a>(&self, command: &'a mut CreateApplicationCommand) -> &'a mut CreateApplicationCommand {
    let subcommands = probability::commands();
    for (_, subcommand) in subcommands {
      command.create_option(|option| subcommand.register(option));
    }

    command.name("probability").description("Probability commands")
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, db: &Database) -> Result<()> {
    let subcommands = probability::commands();

    let subcommand_name = interaction.get_subcommand().unwrap().name;

    let (_, subcommand) = subcommands.iter().find(|pair| pair.0 == subcommand_name).unwrap();
    subcommand.execute(ctx, interaction, db).await?;

    Ok(())
  }
}
