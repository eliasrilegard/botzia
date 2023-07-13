use serenity::async_trait;
use serenity::builder::{CreateApplicationCommand, CreateApplicationCommandOption};
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::model::prelude::interaction::autocomplete::AutocompleteInteraction;
use serenity::prelude::Context;

use crate::database::Database;
use crate::handler::Handler;
use crate::Result;

mod categories;
mod general;
mod time;

type NamedCommands = Vec<(&'static str, Box<dyn SlashCommand + Send + Sync>)>;
type NamedSubCommands = Vec<(&'static str, Box<dyn SlashSubCommand + Send + Sync>)>;

#[async_trait]
pub trait SlashCommand {
  fn register<'a>(&self, command: &'a mut CreateApplicationCommand) -> &'a mut CreateApplicationCommand;

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, db: &Database) -> Result<()>;

  async fn handle_autocomplete(&self, _ctx: &Context, _interaction: &AutocompleteInteraction, _db: &Database) -> Result<()> {
    Err("This command doesn't have any parameters with autocomplete enabled.".into())
  }
}

#[async_trait]
pub trait SlashSubCommand {
  fn register<'a>(&self, subcommand: &'a mut CreateApplicationCommandOption) -> &'a mut CreateApplicationCommandOption;
  
  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, db: &Database) -> Result<()>;

  async fn handle_autocomplete(&self, _ctx: &Context, _interaction: &AutocompleteInteraction, _db: &Database) -> Result<()> {
    Err("This command doesn't have any parameters with autocomplete enabled.".into())
  }
}

impl Handler {
  pub fn load_commands(mut self) -> Self {
    let commands = categories::commands().into_iter()
      .chain(general::commands());

    for (name, command) in commands {
      self.commands.insert(name.to_string(), command);
    }

    self
  }
}