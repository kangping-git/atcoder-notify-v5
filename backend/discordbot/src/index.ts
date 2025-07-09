import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(__dirname, '../../../.env') });

import { Client, GatewayIntentBits } from 'discord.js';
import { commandHandlers, deployCommands } from './deployCommand';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});
client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    client.application?.commands.set(await deployCommands());
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commandHandlers.get(interaction.commandName);
    if (!command) {
        console.error(`コマンド ${interaction.commandName} が見つかりません`);
        return;
    }

    try {
        await command(interaction); // ← ここが実行されるべき
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'エラーが発生しました。', ephemeral: true });
    }
});

client.login(process.env.TOKEN).catch((error) => {
    console.error('Failed to login:', error);
    process.exit(1);
});
