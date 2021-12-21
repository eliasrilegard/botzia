require('dotenv').config();

const Bot = require('./bot.js');
const config = require('../config.json');

client = new Bot(/*config['bot']['defaultPrefix']*/);

client.loadEvents(__dirname.replace('bot', 'events'))
client.loadCommands(__dirname.replace('bot', 'commands'));

client.login(process.env.TOKEN)