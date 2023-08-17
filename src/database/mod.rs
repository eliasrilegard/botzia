use sqlx::PgPool;

pub mod command_usage;
pub mod reminders;
pub mod timezones;
pub mod trivia;

pub const ASSETS_URL: &str = "https://raw.githubusercontent.com/eliasrilegard/botzia/rust/assets";

pub struct Database {
  pub(self) pool: PgPool
}

impl Database {
  pub fn new(pool: PgPool) -> Self {
    Self { pool }
  }
}
