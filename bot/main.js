require('dotenv').config();

const Bot = require('./bot.js');
const config = require('../config.json');
const ApiClient = require('./api.js');

const client = new Bot(config);

client.loadEvents(__dirname.slice(0, -3).concat('events'));
client.loadCommands(__dirname.slice(0, -3).concat('commands'));

client.apiClient = new ApiClient(__dirname.slice(0, -3).concat('database'));

client.login(process.env.TOKEN);