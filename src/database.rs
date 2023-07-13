use serenity::model::prelude::UserId;
use sqlx::{PgPool, Row};

use crate::Result;

pub struct Database {
  pool: PgPool
}

impl Database {
  pub(crate) fn new(pool: PgPool) -> Self {
    Self { pool }
  }

  pub(crate) async fn get_user_timezone(&self, user_id: UserId) -> Result<String> {
    let row = sqlx::query("SELECT utc_offset FROM user_timezones WHERE user_snowflake = $1")
      .bind(user_id.0 as i64)
      .fetch_one(&self.pool)
      .await?;
    // When the queried row doesn't exist, ? returns Err(RowNotFound)

    let offset = row.get::<String, _>(0);
    Ok(offset)
  }

  pub(crate) async fn set_user_timezone(&self, user_id: UserId, offset: String) -> Result<()> {
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

  pub(crate) async fn remove_user_timezone(&self, user_id: UserId) -> Result<()> {
    sqlx::query("DELETE FROM user_timezones WHERE user_snowflake = $1")
      .bind(user_id.0 as i64)
      .execute(&self.pool)
      .await?;

    Ok(())
  }
}