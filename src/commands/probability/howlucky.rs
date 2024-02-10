use probability::distribution::{Binomial, Distribution};
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
    let try_count = interaction.get_integer("try-count").unwrap() as u64;
    let success_count = interaction.get_integer("success-count").unwrap_or(1) as u64;

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

    let bin_dist = Binomial::new(try_count as usize, probability as f64);
    // .distribution computes the Cumulative Distribution Function (CDF): P(X <= success_count).
    // To compute P(X >= success_count), we can do 1 - P(X < success_count), which
    // here is written as  or P(X <= success_count - 1)
    let result = 1.0 - bin_dist.distribution((success_count - 1) as f64);
    
    let display_probability = custom_format(result * 100_f64);

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

// Always keep two decimal places (or significant figures, depending on what's relevant)
fn custom_format(input: f64) -> String {
  let leading_digits = input.log10().ceil();
  let trailing_digits = if leading_digits < 0.0 {
    (2.0 - leading_digits).min(8.0) as usize
  } else {
    2
  };

  format!("{:.*}", trailing_digits, input)
}
