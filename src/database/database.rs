use chrono::{DateTime, Utc};
use serenity::model::prelude::{UserId, GuildId, ChannelId, MessageId};
use sqlx::{PgPool, Row};

use crate::Result;

pub struct Database {
  pub pool: PgPool
}

impl Database {
  pub fn new(pool: PgPool) -> Self {
    Self { pool }
  }

  pub async fn get_user_timezone(&self, user_id: UserId) -> Result<String> {
    let offset = sqlx::query("SELECT utc_offset FROM user_timezones WHERE user_snowflake = $1")
      .bind(user_id.0 as i64)
      .fetch_one(&self.pool)
      .await?
      .get::<String, _>("utc_offset");
    // When the queried row doesn't exist, ? returns Err(RowNotFound)

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
    let pairs = sqlx::query("SELECT user_snowflake, usage_count FROM command_stats WHERE command_name = $1 AND guild_snowflake = $2")
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

  pub async fn create_reminder(&self, due_dt: DateTime<Utc>, channel_id: ChannelId, message_id: MessageId, mentions: Vec<UserId>, message: Option<String>) -> Result<()> {
    let reminder_id = sqlx::query("
      INSERT INTO reminders (due_at, created_at, channel_snowflake, message_snowflake, reminder_message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING reminder_id
    ")
      .bind(due_dt)
      .bind(Utc::now())
      .bind(channel_id.0 as i64)
      .bind(message_id.0 as i64)
      .bind(message)
      .fetch_one(&self.pool)
      .await?
      .get::<i32, _>("reminder_id");

    for mention in mentions {
      sqlx::query("INSERT INTO reminders_mentions VALUES ($1, $2)")
        .bind(&reminder_id)
        .bind(mention.0 as i64)
        .execute(&self.pool)
        .await?;
    }

    Ok(())
  }
}