use anyhow::Context;

use serenity::client::Client;
use serenity::prelude::GatewayIntents;

use shuttle_secrets::{Secrets, SecretStore};
use shuttle_serenity::ShuttleSerenity;

mod handler;

use handler::Handler;

pub type Result<T, E = Box<dyn std::error::Error>> = std::result::Result<T, E>;

#[shuttle_runtime::main]
async fn serenity(
  #[Secrets] secret_store: SecretStore
) -> shuttle_serenity::ShuttleSerenity {
  let token = secret_store.get("DISCORD_TOKEN").context("DISCORD_TOKEN not found")?;
  let intents = GatewayIntents::non_privileged() | GatewayIntents::MESSAGE_CONTENT | GatewayIntents::GUILD_MEMBERS;

  let handler = Handler::default()
    .load_commands();

  let client = Client::builder(token, intents)
    .event_handler(handler)
    .await
    .expect("Err creating client");

  Ok(client.into())
}