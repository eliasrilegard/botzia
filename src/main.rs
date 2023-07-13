use anyhow::Context;

use serenity::client::Client;
use serenity::prelude::GatewayIntents;

use shuttle_secrets::{Secrets, SecretStore};
use shuttle_serenity::ShuttleSerenity;

mod commands;
mod handler;
mod interaction;

use handler::Handler;

pub type Result<T, E = Box<dyn std::error::Error>> = std::result::Result<T, E>;

#[shuttle_runtime::main]
async fn serenity(
  #[Secrets] secret_store: SecretStore
) -> ShuttleSerenity {
  let token = secret_store.get("DISCORD_TOKEN").context("DISCORD_TOKEN not found")?;
  let intents = GatewayIntents::non_privileged() | GatewayIntents::MESSAGE_CONTENT | GatewayIntents::GUILD_MEMBERS;

  let handler = Handler::new()
    .load_commands();

  let client = Client::builder(token, intents)
    .event_handler(handler)
    .await
    .expect("Err creating client");

  Ok(client.into())
}