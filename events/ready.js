const Event = require('../bot/event.js');
const fetch = require('node-fetch');

class Ready extends Event {
  constructor() {
    super('ready', true);
  }

  async execute(client) {  /*  
    // Grab OTDB Token on startup
    this.generateOTDBtoken(client)
      .catch(error => {
        console.log(`There was an error generating new token. Response code: ${error.message}`);
      });
*/
    console.log(`Ready! Logged in as ${client.user.tag}`);
  }

  async generateOTDBtoken(client) {
    const response = await fetch('https://opentdb.com/api_token.php?command=request');
    const data = await response.json();

    if (data.response_code == 0) {
      return client.tokens.set('OTDB', data.token);
    }
    else {
      throw new Error(data.response_code);
    }
  }
}

module.exports = Ready;