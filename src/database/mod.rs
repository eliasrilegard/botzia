use sqlx::PgPool;

pub mod command_usage;
pub mod reminders;
pub mod timezones;
pub mod trivia;

pub struct Database {
  pub(in crate::database) pool: PgPool
}

impl Database {
  pub fn new(pool: PgPool) -> Self {
    Self { pool }
  }
}