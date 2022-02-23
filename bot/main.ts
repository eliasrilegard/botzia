import Bot from './bot';
import * as config from '../config.json';

const client = new Bot(__dirname, config);

client.login(process.env.TOKEN);