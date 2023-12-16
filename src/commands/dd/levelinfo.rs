use serde::Deserialize;
use serenity::all::{CommandInteraction, CommandOptionType};
use serenity::async_trait;
use serenity::builder::{CreateCommandOption, CreateEmbed};
use serenity::client::Context;

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
  fn register(&self) -> CreateCommandOption {
    CreateCommandOption::new(
      CommandOptionType::SubCommand,
      "levelinfo",
      "View level requirements for different items"
    )
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, _: &Database) -> Result<()> {
    let file = include_str!("../../../assets/dungeon_defenders/leveldata.json");
    let qualities: Vec<Quality> = serde_json::from_str(file).expect("JSON was not well formatted.");

    let desc = [padder("Name", "Weapons", "Armor", "Pets"), "".into()]
      .into_iter()
      .chain(qualities.iter().map(|quality| {
        padder(
          &quality.name,
          quality.levels.weapons,
          quality.levels.armor,
          quality.levels.pets
        )
      }))
      .collect::<Vec<_>>();

    let embed = CreateEmbed::new()
      .color(Colors::Blue)
      .title("Level Requirements")
      .description(format!("```{}```", desc.join("\n")));

    interaction.reply_embed(ctx, embed).await?;
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
