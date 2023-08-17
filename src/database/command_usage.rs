use serenity::model::prelude::{GuildId, UserId};
use sqlx::Row;

use super::Database;
use crate::Result;

impl Database {
  pub async fn get_command_usage(&self, command_name: String, guild_id: Option<GuildId>) -> Result<Vec<(UserId, i32)>> {
    let pairs = sqlx::query(
      "SELECT user_snowflake, usage_count FROM command_stats WHERE command_name = $1 AND guild_snowflake = $2"
    )
    .bind(command_name)
    .bind(guild_id.unwrap_or_default().0 as i64)
    .fetch_all(&self.pool)
    .await?
    .iter()
    .map(|row| {
      let id = row.get::<i64, _>("user_snowflake");
      let count = row.get::<i32, _>("usage_count");
      (UserId(id as u64), count)
    })
    .collect::<Vec<_>>();

    Ok(pairs)
  }

  pub async fn increment_command_usage(
    &self,
    command_name: String,
    guild_id: Option<GuildId>,
    user_id: UserId
  ) -> Result<()> {
    sqlx::query(
      "
      INSERT INTO command_stats VALUES ($1, $2, $3, 1)
      ON CONFLICT (command_name, guild_snowflake, user_snowflake) DO UPDATE
        SET usage_count = command_stats.usage_count + 1
    "
    )
    .bind(command_name)
    .bind(guild_id.unwrap_or_default().0 as i64)
    .bind(user_id.0 as i64)
    .execute(&self.pool)
    .await?;

    Ok(())
  }
}
