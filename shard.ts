import { config } from 'dotenv'; config();
import { ShardingManager } from 'discord.js';

const manager = new ShardingManager('./dist/bot/main.js', { token: process.env.TOKEN, totalShards: 'auto' });

manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));

manager.spawn();