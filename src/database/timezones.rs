use serenity::model::prelude::UserId;
use sqlx::Row;

use super::Database;
use crate::Result;

impl Database {
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
    sqlx::query(
      "INSERT INTO user_timezones VALUES ($1, $2)
       ON CONFLICT (user_snowflake) DO
        UPDATE SET utc_offset = EXCLUDED.utc_offset"
    )
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
}
