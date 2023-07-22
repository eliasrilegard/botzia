use sqlx::PgPool;

pub mod command_usage;
pub mod reminders;
pub mod timezones;

pub struct Database {
  pub pool: PgPool
}

impl Database {
  pub fn new(pool: PgPool) -> Self {
    Self { pool }
  }
}