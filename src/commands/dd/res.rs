use serenity::async_trait;
use serenity::builder::{CreateApplicationCommandOption, CreateEmbed, CreateEmbedFooter};
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;

use crate::color::Colors;
use crate::commands::SlashSubCommand;
use crate::database::Database;
use crate::interaction::{InteractionCustomGet, BetterResponse};
use crate::Result;

pub struct Res;

impl Default for Res {
  fn default() -> Self {
    Self
  }
}

#[async_trait]
impl SlashSubCommand for Res {
  fn register<'a>(&self, subcommand: &'a mut CreateApplicationCommandOption) -> &'a mut CreateApplicationCommandOption {
    subcommand
      .kind(CommandOptionType::SubCommand)
      .name("res")
      .description("Get the number of upgrades required to max the resistances of ult and above armor")
      .create_sub_option(|option| option
        .kind(CommandOptionType::String)
        .name("resistances")
        .description("The resistances of the piece, separated by spaces")
        .required(true)
      )
      .create_sub_option(|option| option
        .kind(CommandOptionType::Integer)
        .name("upgrades")
        .description("The number of upgrades on the piece")
        .min_int_value(0)
        .max_int_value(999)
      )
      .create_sub_option(|option| option
        .kind(CommandOptionType::Integer)
        .name("primary-stat")
        .description("The primary stat of the piece, which will be upgraded alongside the resistances")
        .min_int_value(0)
        .max_int_value(999)
      )
      .create_sub_option(|option| option
        .kind(CommandOptionType::Integer)
        .name("secondary-stat")
        .description("The secondary stat if you want to get the stat total of the piece. Doesn't get upgraded")
        .min_int_value(0)
        .max_int_value(999)
      )
      .create_sub_option(|option| option
        .kind(CommandOptionType::Integer)
        .name("fix-slot")
        .description("The slot to upgrade further to fix another 3 res piece. (Number between 1-4)")
        .min_int_value(1)
        .max_int_value(4)
      )
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, _: &Database) -> Result<()> {
    let re = regex::Regex::new(r"\s+").unwrap();
    let resistances_input = interaction.get_string("resistances").unwrap();
    let resists = re.split(resistances_input.as_str())
      .map(|res| res.parse::<i32>().unwrap())
      .filter(|&res| res != 0)
      .collect::<Vec<i32>>();

    let upgrades = interaction.get_integer("upgrades");
    let primary_stat = interaction.get_integer("primary-stat");
    let secondary_stat = interaction.get_integer("secondary-stat");
    let fix_slot = interaction.get_integer("fix-slot");

    if resists.iter().any(|e| e.abs() > 35) {
      let mut embed = CreateEmbed::default();
      embed.color(Colors::RED)
        .title("Reasonable numbers expected");

      interaction.reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true)).await?;
      return Ok(());
    }

    if resists.len() < 3 || resists.len() > 4 {
      let mut embed = CreateEmbed::default();
      embed.color(Colors::RED)
        .title("3 or 4 resistances expected")
        .description("Separate resistances by spaces.");

      interaction.reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true)).await?;
      return Ok(());
    }

    if let Some(slot) = fix_slot {
      let mut embed = CreateEmbed::default();
        embed.color(Colors::RED);

      if resists.len() == 3 {
        embed.title("<a:HUHH:1019679010466304061>  What are you trying to calculate?");

        interaction.reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true)).await?;
        return Ok(());
      }
      else if slot < 1 || slot > 4 {
        embed
          .title("Invalid slot")
          .description("Specify a number between 1 and 4.");

        interaction.reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true)).await?;
        return Ok(());
      }
    }

    // Duplicate resists to have a workable array
    let mut data = resists.clone();
    data.sort_by(|a, b| b.cmp(a));

    let lone_index = if let Some(slot) = fix_slot {
      let lone_res = resists[slot as usize];
      data.iter().position(|&res| res == lone_res)
    } else { None };

    let mut armor = ArmorPiece::new(data, lone_index);

    while armor.res_upgrade_needed() {
      armor.upgrade();
      armor.level += 1;
    }

    // Begin interaction reponse
    let mut embed_footer = CreateEmbedFooter::default();
    embed_footer.text(format!("Resistances: {}{}{}{}",
      resists.iter().map(|res| res.to_string()).collect::<Vec<String>>().join(" "),
      if let Some(upgrade_count) = upgrades { format!("  |  Available upgrades: {upgrade_count}") } else { String::default() },
      if let Some(primary) = primary_stat { format!("  |  Main stat: {primary}") } else { String::default() },
      if let Some(secondary) = secondary_stat { format!("  |  Secondary stat: {secondary}") } else { String::default() }
    ));

    let mut embed = CreateEmbed::default();
    embed.color(Colors::BLUE)
      .title(format!("It takes {} levels to max the resistances", armor.levels_spent))
      .set_footer(embed_footer);

    let description = if let Some(upgrades_count) = upgrades {
      let upgrades_remaining = upgrades_count as i32 - armor.level - 1;

      if let Some(primary) = primary_stat {
        let total = primary as i32 + armor.into_primary + upgrades_remaining;
        let total_boosted = (1.4 * total as f32).ceil() as i32;

        let additional_info = if let Some(secondary) = secondary_stat {
          let secondary_boosted = (1.4 * secondary as f32).ceil() as i32;
          format!("\nThis results in a stat total of **{}**.", total_boosted + secondary_boosted)
        } else { String::default() };

        format!("The piece will end up at **{}** in the main stat, or **{}** with set bonus.{}", total, total_boosted, additional_info)
      }
      else {
        format!("This leaves you with a total of **{}** points to invest in a stat.", armor.into_primary + upgrades_remaining)
      }
    }
    else { String::default() };

    embed.description(format!("{description}\nThe final resistance upgrade will be on lvl **{}**.", armor.level));

    interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
    Ok(())
  }
}

struct ArmorPiece {
  data: Vec<i32>,
  lone_index: Option<usize>,
  target_level: i32,
  level: i32,
  levels_spent: i32,
  into_primary: i32
}

impl ArmorPiece {
  fn new(data: Vec<i32>, lone_index: Option<usize>) -> Self {
    let target_level = if data.len() == 3 { 35 }
      else if let Some(_) = lone_index { 23 }
      else { 29 };

    ArmorPiece { data, lone_index, target_level, level: 1, levels_spent: 0, into_primary: 0 }
  }
  
  fn res_upgrade_needed(&self) -> bool {
    let is_last_available = self.data[self.data.len() - 1] < self.target_level;
    let is_lone_available = if let Some(index) = self.lone_index {
      self.data[index as usize] < 58
    } else { false };

    is_last_available || is_lone_available
  }

  fn upgrade(&mut self) {
    for i in 0..self.data.len() {
      if self.can_upgrade(i) {
        self.levels_spent += 1;
        self.data[i] += ArmorPiece::get_up_amount(self.data[i]);
        if self.data[i] == 0 { self.data[i] = 1 };
        return;
      }
    }
    self.into_primary += 1;
  }
  
  fn can_upgrade(&self, index: usize) -> bool {
    (self.data[index] < 22 || (self.level + 1) % 10 == 0) && self.data[index] < self.get_target_level(index)
  }

  fn get_target_level(&self, res_index: usize) -> i32 {
    if let Some(index) = self.lone_index {
      if res_index == index { 58 }
      else { self.target_level }
    }
    else { self.target_level }
  }

  fn get_up_amount(res: i32) -> i32 {
    if res < 22 {
      std::cmp::max((0.15 * res.abs() as f32).trunc() as i32, 1)
    }
    else { 1 }
  }
}