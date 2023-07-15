use serenity::model::prelude::{UserId, GuildId};
use sqlx::{PgPool, Row};

use crate::Result;

pub struct Database {
  pool: PgPool
}

impl Database {
  pub fn new(pool: PgPool) -> Self {
    Self { pool }
  }

  pub async fn get_user_timezone(&self, user_id: UserId) -> Result<String> {
    let row = sqlx::query("SELECT utc_offset FROM user_timezones WHERE user_snowflake = $1")
      .bind(user_id.0 as i64)
      .fetch_one(&self.pool)
      .await?;
    // When the queried row doesn't exist, ? returns Err(RowNotFound)

    let offset = row.get::<String, _>(0);
    Ok(offset)
  }

  pub async fn set_user_timezone(&self, user_id: UserId, offset: String) -> Result<()> {
    sqlx::query("
      INSERT INTO user_timezones VALUES ($1, $2)
      ON CONFLICT (user_snowflake) DO
        UPDATE SET utc_offset = EXCLUDED.utc_offset
    ")
      .bind(user_id.0 as i64)
      .bind(offset)
      .execute(&self.pool)
      .await?;

    Ok(())
  }

  pub async fn remove_user_timezone(&self, user_id: UserId) -> Result<()> {
    sqlx::query("DELETE FROM user_timezones WHERE user_snowflake = $1")
      .bind(user_id.0 as i64)
      .execute(&self.pool)
      .await?;

    Ok(())
  }

  pub async fn get_command_usage(&self, command_name: String, guild_id: Option<GuildId>) -> Result<Vec<(UserId, i32)>> {
    let rows = sqlx::query("SELECT (user_snowflake, usage_count) FROM command_stats WHERE command_name = $1 AND guild_snowflake = $2")
      .bind(command_name)
      .bind(guild_id.unwrap_or_default().0 as i64)
      .fetch_all(&self.pool)
      .await?;

    let result = rows.iter().map(|row| {
      let (id, count) = row.get::<(i64, i32), _>(0);
      (UserId(id as u64), count)
    }).collect::<Vec<_>>();
    Ok(result)
  }

  pub async fn increment_command_usage(&self, command_name: String, guild_id: Option<GuildId>, user_id: UserId) -> Result<()> {
    sqlx::query("
      INSERT INTO command_stats VALUES ($1, $2, $3, 1)
      ON CONFLICT (command_name, guild_snowflake, user_snowflake) DO UPDATE
        SET usage_count = command_stats.usage_count + 1
    ")
      .bind(command_name)
      .bind(guild_id.unwrap_or_default().0 as i64)
      .bind(user_id.0 as i64)
      .execute(&self.pool)
      .await?;

    Ok(())
  }
}