import Bot, { ClientConfig } from './bot';
import config from '../config.json';

const client = new Bot(__dirname, config as ClientConfig);

client.login(process.env.TOKEN!);