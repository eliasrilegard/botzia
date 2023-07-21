use std::thread;
use std::time::Duration;

use chrono::{DateTime,Utc};
use sqlx::{PgPool, Row, FromRow};
use tracing::error;

use serenity::Error;
use serenity::builder::{CreateEmbed, CreateMessage};
use serenity::model::prelude::{Channel, ChannelId, MessageId, UserId, Message};
use serenity::http::Http;

use crate::Result;
use crate::color::Colors;

use super::Database;

struct Reminder {
  id: i32,
  due_at_utc: DateTime<Utc>,
  created_dt_utc: DateTime<Utc>,
  channel_id: ChannelId,
  message_id: MessageId,
  message: Option<String>,
  mentions: Vec<UserId>
}

#[derive(FromRow)]
struct PartialReminder {
  reminder_id: i32,
  due_at: DateTime<Utc>,
  created_at: DateTime<Utc>,
  channel_snowflake: i64,
  message_snowflake: i64,
  reminder_message: Option<String>
}


impl Reminder {
  fn from_partial_components(partial: PartialReminder, user_ids: Vec<i64>) -> Self {
    Self {
      id: partial.reminder_id,
      due_at_utc: partial.due_at,
      created_dt_utc: partial.created_at,
      channel_id: ChannelId(partial.channel_snowflake as u64),
      message_id: MessageId(partial.message_snowflake as u64),
      message: partial.reminder_message,
      mentions: user_ids.iter().map(|&id| UserId(id as u64)).collect()
    }
  }

  fn time_left(&self) -> Duration {
    (self.due_at_utc - Utc::now()).to_std().unwrap_or(Duration::ZERO)
  }

  async fn send(&self, http: &Http) -> Result<()> {
    match self.channel_id.to_channel(&http).await {
      Ok(Channel::Guild(channel)) => {
        let reference = channel.message(&http, self.message_id).await;
        channel.send_message(&http, |msg| self.construct_response(msg, reference.ok())).await?;
        Ok(())
      }
      
      Ok(Channel::Private(channel)) => {
        let reference = channel.message(&http, self.message_id).await;
        channel.send_message(&http, |msg| self.construct_response(msg, reference.ok())).await?;
        Ok(())
      }

      Err(why) => Err(why.into()),
      _ => Err(Error::Other("Channel not of valid type").into())
    }
  }

  fn construct_response<'a,'b>(&self, msg: &'a mut CreateMessage<'b>, reference: Option<Message>) -> &'a mut CreateMessage<'b> {
    let mut embed = CreateEmbed::default();
    embed
      .color(Colors::GREEN)
      .title("Ding, here's your reminder!")
      .timestamp(self.created_dt_utc);
    
    if let Some(message) = &self.message {
      embed.field("Message", message, false);
    }

    let mentions = self.mentions.iter().map(|user_id| user_id.0.to_string()).collect::<Vec<_>>();

    if let Some(message) = reference {
      msg.reference_message(&message);
    }

    msg
      .content(format!("<@{}>", mentions.join("> <@")))
      .set_embed(embed)
  }
}


impl Database {
  pub fn watch_reminders(&self, token: &String) -> Result<()> {
    let http = Http::new(token);
    let pool = self.pool.clone();

    tokio::spawn(async move {
      loop {
        let mut remainder_sleep = Duration::from_secs(60);

        match get_reminders(&pool).await {
          Ok(reminders) => {
            for reminder in reminders {
              let time_until_due = reminder.time_left();
              remainder_sleep -= time_until_due;
              thread::sleep(time_until_due);

              if let Err(why) = reminder.send(&http).await {
                error!("Could not send reminder:\n{}", why);
              }
              if let Err(why) = remove_reminder(&pool, reminder.id).await {
                error!("Could not delete reminder:\n{}", why);
              }
            }
          }
          Err(why) => error!("Could not retrieve reminders:\n{}", why)
        }

        thread::sleep(remainder_sleep);
      }
    });

    Ok(())
  }
}


async fn get_reminders(pool: &PgPool) -> Result<Vec<Reminder>> {
  let partial_reminders = sqlx::query_as::<_, PartialReminder>("
    SELECT * FROM reminders WHERE
      due_at::DATE = NOW()::DATE AND
      due_at::TIME < NOW()::TIME + INTERVAL '1 minute'
  ")
    .fetch_all(pool)
    .await?;

  let mut reminders: Vec<Reminder> = vec![];

  for partial_reminder in partial_reminders {
    let user_ids = sqlx::query("SELECT user_snowflake FROM reminders_mentions WHERE reminder_id = $1")
      .bind(partial_reminder.reminder_id)
      .fetch_all(pool)
      .await?
      .iter()
      .map(|row| row.get::<i64, _>("user_snowflake"))
      .collect::<Vec<_>>();
    
    reminders.push(Reminder::from_partial_components(partial_reminder, user_ids));
  }

  Ok(reminders)
}

async fn remove_reminder(pool: &PgPool, id: i32) -> Result<()> {
  sqlx::query("DELETE FROM reminders WHERE reminder_id = $1")
    .bind(id)
    .execute(pool)
    .await?;

  Ok(())
}