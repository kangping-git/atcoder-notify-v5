import { ChatInputCommandInteraction } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

export const commandHandlers: Map<string, (interaction: ChatInputCommandInteraction) => void> = new Map();

export async function deployCommands() {
    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = (await import(filePath)).default;
        if (command instanceof Array) {
            for (const subcommand of command) {
                if ('data' in subcommand && 'execute' in subcommand) {
                    commands.push(subcommand.data.toJSON());
                    commandHandlers.set(subcommand.data.name, subcommand.execute);
                } else {
                    console.warn(`サブコマンド ${file} は "data" または "execute" を持っていません。`);
                }
            }
        } else {
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
                commandHandlers.set(command.data.name, command.execute);
            } else {
                console.warn(`コマンド ${file} は "data" または "execute" を持っていません。`);
            }
        }
    }

    return commands;
}
