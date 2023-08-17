use serde::Deserialize;
use serenity::async_trait;
use serenity::builder::{CreateApplicationCommandOption, CreateEmbed};
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;

use crate::color::Colors;
use crate::commands::SlashSubCommand;
use crate::database::Database;
use crate::interaction::BetterResponse;
use crate::Result;

#[derive(Deserialize)]
struct Quality {
  name: String,
  levels: Levels
}

#[derive(Deserialize)]
struct Levels {
  armor: i32,
  pets: i32,
  weapons: i32
}

#[derive(Default)]
pub struct LevelInfo;

#[async_trait]
impl SlashSubCommand for LevelInfo {
  fn register<'a>(&self, subcommand: &'a mut CreateApplicationCommandOption) -> &'a mut CreateApplicationCommandOption {
    subcommand
      .kind(CommandOptionType::SubCommand)
      .name("levelinfo")
      .description("View level requirements for different items")
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, _: &Database) -> Result<()> {
    let file = include_str!("../../../assets/dungeon_defenders/leveldata.json");
    let qualities: Vec<Quality> = serde_json::from_str(file).expect("JSON was not well formatted.");

    let desc = [padder("Name", "Weapons", "Armor", "Pets"), "".into()]
      .into_iter()
      .chain(
        qualities
          .iter()
          .map(|q| padder(&q.name, q.levels.weapons, q.levels.armor, q.levels.pets))
      )
      .collect::<Vec<_>>();

    let mut embed = CreateEmbed::default();
    embed
      .color(Colors::Blue)
      .title("Level Requirements")
      .description(format!("```{}```", desc.join("\n")));

    interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
    Ok(())
  }
}

fn padder<N, T>(name: N, weapon: T, armor: T, pet: T) -> String
where
  N: ToString,
  T: ToString
{
  format!(
    "{: <14}{: <9}{: <9}{: <5}",
    name.to_string(),
    weapon.to_string(),
    armor.to_string(),
    pet.to_string()
  )
}
