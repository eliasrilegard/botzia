use std::sync::Arc;

use serenity::async_trait;
use serenity::builder::CreateInteractionResponseData;
use serenity::http::Http;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;

use tracing::error;

use crate::Result;

#[async_trait]
pub trait BetterResponse {
  async fn reply<'a, ReplyFn>(&self, http: &Arc<Http>, reply: ReplyFn) -> Result<()>
    where for<'b> ReplyFn: FnOnce(&'b mut CreateInteractionResponseData<'a>) -> &'b mut CreateInteractionResponseData<'a> + Send;
}

#[async_trait]
impl BetterResponse for ApplicationCommandInteraction {
  async fn reply<'a, ReplyFn>(&self, http: &Arc<Http>, reply: ReplyFn) -> Result<()>
    where for<'b> ReplyFn: FnOnce(&'b mut CreateInteractionResponseData<'a>) -> &'b mut CreateInteractionResponseData<'a> + Send
  {
    if let Err(why) = self.create_interaction_response(http, |response| {
      response.interaction_response_data(|message| reply(message))
    }).await {
      error!("Encountered an error while reponding to chat command:\n{:?}", why);
    }

    Ok(())
  }
}