require('dotenv').config();

const Bot = require('./bot.js');
const config = require('../config.json');

client = new Bot(/*config['bot']['defaultPrefix']*/);

client.loadEvents(__dirname.slice(0,-3).concat('events'));
client.loadCommands(__dirname.slice(0,-3).concat('commands'));

client.login(process.env.TOKEN)