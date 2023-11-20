use serenity::async_trait;
use serenity::builder::{CreateApplicationCommandOption, CreateEmbed};
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;

use super::howmanyruns::verify_probability;
use crate::color::Colors;
use crate::commands::SlashSubCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Default)]
pub struct HowLucky;

#[async_trait]
impl SlashSubCommand for HowLucky {
  fn register<'a>(&self, subcommand: &'a mut CreateApplicationCommandOption) -> &'a mut CreateApplicationCommandOption {
    subcommand
      .kind(CommandOptionType::SubCommand)
      .name("howlucky")
      .description("Calculate how lucky a drop was")
      .create_sub_option(|option| {
        option
          .kind(CommandOptionType::String)
          .name("probability")
          .description("A decimal number or fraction between 0 and 1 (not inclusive)")
          .required(true)
      })
      .create_sub_option(|option| {
        option
          .kind(CommandOptionType::Integer)
          .name("try-count")
          .description("The number of items/tries taken")
          .min_int_value(1)
          .required(true)
      })
      .create_sub_option(|option| {
        option
          .kind(CommandOptionType::Integer)
          .name("success-count")
          .description("The number of successes/desired items dropped")
          .min_int_value(1)
      })
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, _: &Database) -> Result<()> {
    let probability_input = interaction.get_string("probability").unwrap();
    let try_count = interaction.get_integer("try-count").unwrap() as i32;
    let success_count = interaction.get_integer("success-count").unwrap_or(1) as i32;

    let verified = verify_probability(probability_input.as_str());
    if verified.is_none() {
      let mut embed = CreateEmbed::default();
      embed
        .color(Colors::Red)
        .title("Invalid format")
        .description("The argument `probability` must be a decimal number or a fraction, and be between 0 and 1.");

      interaction
        .reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true))
        .await?;
      return Ok(());
    }
    let probability = verified.unwrap();

    // P(X >= m | n tries) =
    // 1 - P(X < m | n tries) =
    // 1 - \sum_{k = 0}^{m - 1} {n \choose k} p^k (1 - p)^{n - k}
    //
    // Here m = successCount; n = tryCount

    let mut result = 1_f32;
    for k in 0..success_count {
      result -=
        (choose(try_count as u64, k as u64) as f32) * probability.powi(k) * (1_f32 - probability).powi(try_count - k);
    }

    let display_probability = format!("{:.1$}", result * 100_f32, if result >= 0.01 { 2 } else { 1 });

    let inner_description = if success_count > 1 {
      format!("**{}** drops (or better)", success_count)
    } else {
      "a drop".to_string()
    };

    let mut embed = CreateEmbed::default();
    embed
      .color(Colors::Blue)
      .title("How lucky were you?")
      .description(format!(
        "With a drop chance of **{}**, getting {} within **{}** tries has a **{}%** chance of happening.",
        probability_input, inner_description, try_count, display_probability
      ));

    interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
    Ok(())
  }
}

fn choose(n: u64, k: u64) -> u64 {
  if k > n {
    0
  } else {
    let range = 1..=k.min(n - k);
    range.fold(1, |acc, val| acc * (n - val + 1) / val)
  }
}
