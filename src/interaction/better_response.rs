use serenity::all::CommandInteraction;
use serenity::async_trait;
use serenity::builder::{
  CreateAutocompleteResponse,
  CreateEmbed,
  CreateInteractionResponse,
  CreateInteractionResponseMessage
};
use serenity::http::CacheHttp;
use tracing::error;

use crate::Result;

#[async_trait]
pub trait BetterResponse {
  async fn reply(&self, http: impl CacheHttp, data: CreateInteractionResponseMessage) -> Result<()>;
  async fn reply_embed(&self, http: impl CacheHttp, embed: CreateEmbed) -> Result<()>;
  async fn reply_embed_ephemeral(&self, http: impl CacheHttp, embed: CreateEmbed) -> Result<()>;
  async fn respond_autocomplete(&self, http: impl CacheHttp, data: CreateAutocompleteResponse) -> Result<()>;
}

#[async_trait]
impl BetterResponse for CommandInteraction {
  async fn reply(&self, http: impl CacheHttp, data: CreateInteractionResponseMessage) -> Result<()> {
    let builder = CreateInteractionResponse::Message(data);

    if let Err(why) = self.create_response(http, builder).await {
      error!("Encountered an error while responding:\n{why:?}");
    }

    Ok(())
  }

  async fn reply_embed(&self, http: impl CacheHttp, embed: CreateEmbed) -> Result<()> {
    let data = CreateInteractionResponseMessage::new().embed(embed);

    self.reply(http, data).await?;

    Ok(())
  }

  async fn reply_embed_ephemeral(&self, http: impl CacheHttp, embed: CreateEmbed) -> Result<()> {
    let data = CreateInteractionResponseMessage::new().embed(embed).ephemeral(true);

    self.reply(http, data).await?;

    Ok(())
  }

  async fn respond_autocomplete(&self, http: impl CacheHttp, data: CreateAutocompleteResponse) -> Result<()> {
    let builder = CreateInteractionResponse::Autocomplete(data);

    if let Err(why) = self.create_response(http, builder).await {
      error!("Encountered an error while responding to autocomplete:\n{why:?}")
    }

    Ok(())
  }
}
