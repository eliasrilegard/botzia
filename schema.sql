CREATE TABLE IF NOT EXISTS user_timezones (
  user_snowflake BIGINT PRIMARY KEY,
  utc_offset TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS command_stats (
  command_name TEXT NOT NULL,
  guild_snowflake BIGINT NOT NULL,
  user_snowflake BIGINT NOT NULL,
  usage_count INT NOT NULL,
  CONSTRAINT pk_command_stats PRIMARY KEY (command_name, guild_snowflake, user_snowflake)
);


CREATE TABLE IF NOT EXISTS reminders (
  reminder_id SERIAL PRIMARY KEY,
  due_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  channel_snowflake BIGINT NOT NULL,
  message_snowflake BIGINT NOT NULL,
  reminder_message TEXT
);

CREATE TABLE IF NOT EXISTS reminders_mentions (
  reminder_id INT NOT NULL,
  user_snowflake BIGINT NOT NULL,
  CONSTRAINT pk_reminders_mentions PRIMARY KEY (reminder_id, user_snowflake), -- Safety
  FOREIGN KEY (reminder_id) REFERENCES reminders(reminder_id) ON DELETE CASCADE
);