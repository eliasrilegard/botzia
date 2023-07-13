use std::collections::HashMap;

use serenity::async_trait;
use serenity::model::prelude::command::Command;
use serenity::model::prelude::interaction::Interaction;
use serenity::model::prelude::Ready;
use serenity::prelude::{Context, EventHandler};

use tracing::{error, info};

use crate::commands::SlashCommand;

pub struct Handler {
  pub commands: HashMap<String, Box<dyn SlashCommand + Send + Sync>>
}

impl Handler {
  pub fn new() -> Self {
    Self {
      commands: HashMap::new()
    }
  }
}

#[async_trait]
impl EventHandler for Handler {
  async fn interaction_create(&self, ctx: Context, base_interaction: Interaction) {
    match base_interaction {
      Interaction::ApplicationCommand(interaction) => {
        if let Some(command) = self.commands.get(&interaction.data.name) {
          if let Err(why) = command.execute(&ctx, &interaction).await {
            error!("Encountered an error while executing a command:\n{:?}", why);
          }
        }
      }

      Interaction::Autocomplete(interaction) => {
        if let Some(command) = self.commands.get(&interaction.data.name) {
          if let Err(why) = command.handle_autocomplete(&ctx, &interaction).await {
            error!("Encountered an error while responding to autocomplete:\n{}", why);
          }
        }
      }

      _ => ()
    }
  }

  async fn ready(&self, ctx: Context, ready: Ready) {
    info!("Registering commands...");
    
    if let Err(why) = Command::set_global_application_commands(&ctx.http, |commands| {
      for (_, command) in &self.commands {
        commands.create_application_command(|builder| command.register(builder));
      }
      commands
    }).await {
      error!("Command registration failed:\n{:?}", why);
    }

    info!("Ready! Logged in as {}", ready.user.tag());
  }
}