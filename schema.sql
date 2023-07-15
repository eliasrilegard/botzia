CREATE TABLE IF NOT EXISTS user_timezones (
  user_snowflake BIGINT PRIMARY KEY,
  utc_offset TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS command_stats (
  command_name TEXT NOT NULL,
  guild_snowflake BIGINT NOT NULL,
  user_snowflake BIGINT NOT NULL,
  usage_count INT NOT NULL,
  CONSTRAINT pk PRIMARY KEY (command_name, guild_snowflake, user_snowflake)
);