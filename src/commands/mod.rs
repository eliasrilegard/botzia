use serenity::async_trait;
use serenity::builder::{CreateApplicationCommand, CreateApplicationCommandOption};
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::model::prelude::interaction::autocomplete::AutocompleteInteraction;
use serenity::prelude::Context;

use crate::handler::Handler;
use crate::Result;

mod general;

type NamedCommands = Vec<(&'static str, Box<dyn SlashCommand + Send + Sync>)>;
type NamedSubCommands = Vec<(&'static str, Box<dyn SlashSubCommand + Send + Sync>)>;

#[async_trait]
pub trait SlashCommand {
  fn register<'a>(&self, command: &'a mut CreateApplicationCommand) -> &'a mut CreateApplicationCommand;

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction) -> Result<()>;

  async fn handle_autocomplete(&self, _ctx: &Context, _interaction: &AutocompleteInteraction) -> Result<()> {
    Err("This command doesn't have any parameters with autocomplete enabled.".into())
  }
}

#[async_trait]
pub trait SlashSubCommand {
  fn register<'a>(&self, subcommand: &'a mut CreateApplicationCommandOption) -> &'a mut CreateApplicationCommandOption;

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction) -> Result<()>;
}

impl Handler {
  pub fn load_commands(mut self) -> Self {
    let commands = general::commands().into_iter();

    for (name, command) in commands {
      self.commands.insert(name.to_string(), command);
    }

    self
  }
}