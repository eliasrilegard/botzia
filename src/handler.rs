use serenity::async_trait;
use serenity::model::prelude::Ready;
use serenity::prelude::{Context, EventHandler};

use tracing::info;

pub struct Handler;

impl Default for Handler {
  fn default() -> Self {
    Self
  }
}

#[async_trait]
impl EventHandler for Handler {
  async fn ready(&self, ctx: Context, ready: Ready) {
    info!("Ready! Logged in as {}", ready.user.tag());
  }
}