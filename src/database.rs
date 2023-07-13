use sqlx::PgPool;

pub struct Database {
  pool: PgPool
}

impl Database {
  pub fn new(pool: PgPool) -> Self {
    Self { pool }
  }
}