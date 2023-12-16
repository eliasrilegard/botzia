use serde::Deserialize;
use sqlx::Row;

use super::Database;
use crate::Result;

#[derive(Deserialize)]
struct RequestTokenResponse {
  response_code: i32,
  token: Option<String>
}

#[derive(Deserialize)]
struct RequestCategoriesReponse {
  trivia_categories: Vec<TriviaCategory>
}

#[derive(Deserialize)]
pub struct TriviaCategory {
  pub name: String,
  pub id: i32
}

#[derive(Deserialize)]
struct GenerateTokenResponse {
  reponse_token: String
}

impl Database {
  pub async fn get_server_token(&self, id: u64) -> Result<String> {
    match sqlx::query("SELECT token FROM trivia_tokens WHERE guild_snowflake = $1")
      .bind(id as i64)
      .fetch_one(&self.pool)
      .await
    {
      Ok(row) => Ok(row.get::<String, _>("token")),
      Err(_) => {
        let response = reqwest::get("https://opentdb.com/api_token.php?command=request").await?;
        let data = response.json::<RequestTokenResponse>().await?;
        match data.response_code {
          0 => {
            let token = data.token.unwrap();
            sqlx::query("INSERT INTO trivia_tokens VALUES ($1, $2)")
              .bind(id as i64)
              .bind(&token)
              .execute(&self.pool)
              .await?;

            Ok(token)
          }
          _ => Err(format!("Could not generate new token.\nResponse code: {}", data.response_code).into())
        }
      }
    }
  }

  pub async fn get_trivia_categories(&self) -> Result<Vec<TriviaCategory>> {
    let rows = sqlx::query("SELECT * FROM trivia_categories")
      .fetch_all(&self.pool)
      .await?;

    if !rows.is_empty() {
      let categories = rows
        .iter()
        .map(|row| TriviaCategory {
          name: row.get::<String, _>("category_name"),
          id: row.get::<i32, _>("category_id")
        })
        .collect::<Vec<_>>();

      Ok(categories)
    } else {
      // Fetch and store
      let response = reqwest::get("https://opentdb.com/api_category.php").await?;
      let data = response.json::<RequestCategoriesReponse>().await?;
      let mut ids: Vec<i32> = vec![];
      let mut names: Vec<String> = vec![];

      for category in &data.trivia_categories {
        ids.push(category.id);
        names.push(category.name.clone());
      }

      // https://github.com/launchbadge/sqlx/issues/294#issuecomment-716149160
      sqlx::query("INSERT INTO trivia_categories SELECT * FROM UNNEST($1, $2)")
        .bind(ids)
        .bind(names)
        .execute(&self.pool)
        .await?;

      Ok(data.trivia_categories)
    }
  }

  pub async fn regenerate_server_token(&self, id: u64) -> Result<()> {
    let response = reqwest::get("https://opentdb.com/api_token.php?command=request")
      .await?
      .json::<GenerateTokenResponse>()
      .await?;

    sqlx::query("UPDATE trivia_tokens SET token = $1 WHERE guild_snowflake = $2")
      .bind(response.reponse_token)
      .bind(id as i64)
      .execute(&self.pool)
      .await?;

    Ok(())
  }
}
