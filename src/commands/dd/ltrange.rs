use serenity::async_trait;
use serenity::builder::{CreateApplicationCommandOption, CreateEmbed};
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;

use crate::color::Colors;
use crate::commands::SlashSubCommand;
use crate::database::Database;
use crate::interaction::{InteractionCustomGet, BetterResponse};
use crate::Result;

pub struct LTRange;

impl Default for LTRange {
  fn default() -> Self {
    Self
  }
}

#[async_trait]
impl SlashSubCommand for LTRange {
  fn register<'a>(&self, subcommand: &'a mut CreateApplicationCommandOption) -> &'a mut CreateApplicationCommandOption {
    subcommand
      .kind(CommandOptionType::SubCommand)
      .name("ltrange")
      .description("Find the closest LT breakpoints to your current range")
      .create_sub_option(|option| option
        .kind(CommandOptionType::Integer)
        .name("range")
        .description("Your current range")
        .min_int_value(0)
        .max_int_value(9999)
        .required(true)
      )
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, _: &Database) -> Result<()> {
    // These offsets are taken from https://quarplet.com/chaintargets_breakpoints.txt
    // Since we're storing the breakpoints in an array, we need to offset the index by some value
    let normal: Vec<i32> = vec![0, 1, 2, 4, 6, 8, 11, 14, 19, 23, 29, 35, 43, 51, 60, 70, 81, 93, 106, 120, 136, 153, 171, 190, 211, 233, 257, 282, 309, 337, 367, 399, 432, 468, 504, 543, 584, 626, 671, 717, 766, 816, 869, 924, 981, 1040, 1101, 1165, 1231, 1300, 1370, 1444, 1519, 1598, 1679, 1762, 1848, 1937, 2028, 2122, 2219, 2319, 2421, 2526, 2635, 2746, 2860, 2977, 3098, 3221, 3347, 3477, 3610, 3746, 3885, 4027, 4173, 4322, 4475, 4631, 4790, 4953, 5119, 5289, 5463, 5640, 5820, 6005, 6193, 6385, 6581, 6780, 6983, 7190, 7402, 7617, 7835, 8058, 8285, 8516, 8752, 8991, 9234, 9482, 9734, 9990];
    let upped: Vec<i32> = vec![0, 7, 15, 24, 34, 45, 57, 70, 84, 100, 117, 135, 154, 175, 197, 221, 246, 273, 301, 331, 363, 396, 432, 468, 507, 548, 590, 635, 681, 730, 780, 833, 888, 945, 1004, 1065, 1129, 1195, 1264, 1334, 1408, 1483, 1562, 1643, 1726, 1812, 1901, 1992, 2086, 2183, 2283, 2385, 2490, 2599, 2710, 2824, 2941, 3062, 3185, 3311, 3441, 3574, 3710, 3849, 3991, 4137, 4286, 4439, 4595, 4754, 4917, 5083, 5253, 5427, 5604, 5784, 5969, 6157, 6349, 6545, 6744, 6947, 7154, 7366, 7581, 7799, 8022, 8249, 8480, 8716, 8955, 9198, 9446, 9698, 9954];
    // +6, +17

    let current_range = interaction.get_integer("range").unwrap() as i32;
    let displayed_values = 5;

    // Find index of first value >= current_range
    let index_normal = closest_breakpoint(&current_range, &normal, displayed_values / 2);
    let index_upped = closest_breakpoint(&current_range, &upped, displayed_values / 2);

    let mut embed = CreateEmbed::default();
    embed.color(Colors::Blue)
      .title("Closest breakpoints")
      .description(format!("Here are the closest breakpoints to your current range of **{}**.\n`Range - Targets`", current_range))
      .fields([
        ("Normal", formatter(&normal, index_normal, &displayed_values, 6), true),
        ("Upgraded", formatter(&upped, index_upped, &displayed_values, 17), true)
      ]);

    interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
    Ok(())
  }
}

fn constrain(value: i32, minimum: i32, maximum: i32) -> i32 {
  minimum.max(maximum.min(value))
}

fn closest_breakpoint(range: &i32, breakpoints: &Vec<i32>, margin: i32) -> i32 {
  let index = breakpoints.iter().position(|breakpoint| breakpoint >= range).unwrap() as i32;
  constrain(index, margin, breakpoints.len() as i32 - 1 - margin)
}

fn formatter(breakpoints: &[i32], index: i32, displayed_values: &i32, shift: i32) -> String {
  let mut result: Vec<String> = vec![];
  let range = -((displayed_values - 1) / 2)..=(displayed_values / 2);
  for i in range {
    result.push(format!("{} - {}", breakpoints[(index + i) as usize], index + i + shift));
  }
  format!("```{}```", result.join("\n"))
}