use serenity::all::{CommandInteraction, CommandOptionType};
use serenity::async_trait;
use serenity::builder::{CreateCommandOption, CreateEmbed};
use serenity::client::Context;

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
  fn register(&self) -> CreateCommandOption {
    CreateCommandOption::new(
      CommandOptionType::SubCommand,
      "howlucky",
      "Calculate how lucky a drop was"
    )
    .add_sub_option(
      CreateCommandOption::new(
        CommandOptionType::String,
        "probability",
        "A decimal number or fraction between 0 and 1 (not inclusive)"
      )
      .required(true)
    )
    .add_sub_option(
      CreateCommandOption::new(
        CommandOptionType::Integer,
        "try-count",
        "The number of items/tries taken"
      )
      .min_int_value(1)
      .required(true)
    )
    .add_sub_option(
      CreateCommandOption::new(
        CommandOptionType::Integer,
        "success-count",
        "The number of successes/desired items dropped"
      )
      .min_int_value(1)
    )
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, _: &Database) -> Result<()> {
    let probability_input = interaction.get_string("probability").unwrap();
    let try_count = interaction.get_integer("try-count").unwrap() as i32;
    let success_count = interaction.get_integer("success-count").unwrap_or(1) as i32;

    if success_count > try_count {
      let embed = CreateEmbed::new()
        .color(Colors::Red)
        .title("Too many successes")
        .description("`success-count` must be smaller than or equal to `try-count`");

      interaction.reply_embed_ephemeral(&ctx.http, embed).await?;
      return Ok(());
    }

    let probability = match verify_probability(probability_input.as_str()) {
      Some(probability) => probability,
      None => {
        let embed = CreateEmbed::new()
          .color(Colors::Red)
          .title("Invalid format")
          .description("The argument `probability` must be a decimal number or a fraction, and be between 0 and 1.");

        interaction.reply_embed_ephemeral(&ctx.http, embed).await?;
        return Ok(());
      }
    };

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
    
    let display_probability = custom_format(result * 100_f32); // Always keep two decimal places

    let inner_description = if success_count > 1 {
      format!("**{success_count}** drops (or better)")
    } else {
      "a drop".to_string()
    };

    let try_format = if try_count > 1 { "tries" } else { "try" };

    let embed = CreateEmbed::new()
      .color(Colors::Blue)
      .title("How lucky were you?")
      .description(format!(
        "With a drop chance of **{p}**, getting {m} within **{n}** {t} has a **{x}%** chance of happening.",
        p = probability_input,
        m = inner_description,
        n = try_count,
        t = try_format,
        x = display_probability
      ));

    interaction.reply_embed(&ctx.http, embed).await?;
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

fn custom_format(input: f32) -> String {
  let leading_digits = input.log10().ceil() as i32;
  let trailing_digits = if leading_digits < 0 {
    (2 - leading_digits).min(6) as usize
  } else {
    2
  };

  format!("{:.*}", trailing_digits, input)
}
