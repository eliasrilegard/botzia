use serde::Deserialize;
use serenity::all::{CommandInteraction, CommandOptionType};
use serenity::async_trait;
use serenity::builder::{
  AutocompleteChoice,
  CreateAttachment,
  CreateAutocompleteResponse,
  CreateCommandOption,
  CreateEmbed,
  CreateInteractionResponseFollowup
};
use serenity::client::Context;

use crate::color::Colors;
use crate::commands::SlashSubCommand;
use crate::database::{Database, ASSETS_URL};
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Deserialize)]
struct QuoteData {
  name: String,
  file: String
}

#[derive(Default)]
pub struct Quote;

#[async_trait]
impl SlashSubCommand for Quote {
  fn register(&self) -> CreateCommandOption {
    CreateCommandOption::new(
      CommandOptionType::SubCommand,
      "quote",
      "Post a legendary quote from the DD community"
    )
    .add_sub_option(
      CreateCommandOption::new(CommandOptionType::String, "quote", "The quote to post")
        .set_autocomplete(true)
        .required(true)
    )
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, _: &Database) -> Result<()> {
    let quotes_json = include_str!("../../../assets/dungeon_defenders/quotes/quotemap.json");
    let quotes: Vec<QuoteData> = serde_json::from_str(quotes_json).expect("JSON was not well formatted");

    let key = interaction.get_string("quote").unwrap();

    match quotes.iter().find(|quote| quote.name == key) {
      Some(quote) => {
        interaction.defer(ctx).await?;

        let image_bytes = reqwest::get(format!("{ASSETS_URL}/dungeon_defenders/quotes/img/{}", quote.file))
          .await?
          .bytes()
          .await?;
        let image = CreateAttachment::bytes(image_bytes, quote.name.clone());

        let builder = CreateInteractionResponseFollowup::new().add_file(image);
        interaction.create_followup(ctx, builder).await?;
      }
      None => {
        let embed = CreateEmbed::new()
          .color(Colors::Red)
          .title("Quote not found")
          .description("Could not identify the quote");

        interaction.reply_embed(ctx, embed).await?;
      }
    }

    Ok(())
  }

  async fn autocomplete(&self, ctx: &Context, interaction: &CommandInteraction, _: &Database) -> Result<()> {
    let quotes_json = include_str!("../../../assets/dungeon_defenders/quotes/quotemap.json");
    let quotes: Vec<QuoteData> = serde_json::from_str(quotes_json).expect("JSON was not well formatted");

    let focused_value = interaction
      .data
      .autocomplete()
      .map(|option| option.value.to_ascii_lowercase().replace(' ', ""))
      .unwrap_or_default();

    let choices: Vec<_> = quotes
      .iter()
      .filter(|quote| quote.name == focused_value)
      .take(25)
      .map(|quote| AutocompleteChoice::new(quote.name.clone(), quote.name.clone()))
      .collect();

    let data = CreateAutocompleteResponse::new().set_choices(choices);
    interaction.respond_autocomplete(ctx, data).await?;
    Ok(())
  }
}
