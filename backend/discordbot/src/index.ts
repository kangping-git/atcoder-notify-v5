import { config } from 'dotenv';
import { Database } from './database';
import path from 'path';
config({ path: path.join(__dirname, '../../../.env') });
Database.initDatabase();

import { Client, GatewayIntentBits, Message, MessageFlags } from 'discord.js';
import { commandHandlers, deployCommands } from './deployCommand';
import { connectSSE } from './live';

export const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});
client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    client.application?.commands.set(await deployCommands());
    connectSSE();
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commandHandlers.get(interaction.commandName);
    if (!command) {
        console.error(`コマンド ${interaction.commandName} が見つかりません`);
        return;
    }

    try {
        await command(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'エラーが発生しました。', flags: [MessageFlags.Ephemeral] });
    }
});

client.login(process.env.TOKEN).catch((error) => {
    console.error('Failed to login:', error);
    process.exit(1);
});
