CREATE TABLE IF NOT EXISTS user_timezones (
  user_snowflake BIGINT PRIMARY KEY,
  utc_offset TEXT NOT NULL
);