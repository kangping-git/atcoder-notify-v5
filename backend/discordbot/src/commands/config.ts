import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { createErrorEmbed } from '../error_embed';
import { Database } from '../database';

const baseCommand = new SlashCommandBuilder().setName('server').setDescription('サーバーの設定関連のコマンド');

export default [
    {
        data: baseCommand
            .addSubcommand((subcommand) =>
                subcommand
                    .setName('set-ac-notify-channel')
                    .setDescription('ACを通知するチャンネルを指定します')
                    .addChannelOption((channel) => channel.setName('channel').setDescription('ACを通知するチャンネル').setRequired(true)),
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName('set-contest-notify-channel')
                    .setDescription('コンテストを通知するチャンネルを指定します')
                    .addChannelOption((channel) => channel.setName('channel').setDescription('コンテストを通知するチャンネル').setRequired(true)),
            ),
        async execute(interaction: ChatInputCommandInteraction) {
            let subCommand = interaction.options.getSubcommand();
            if (!subCommand) {
                interaction.reply({
                    embeds: [createErrorEmbed(999)],
                    flags: [MessageFlags.Ephemeral],
                });
                return;
            }
            if (subCommand == 'set-contest-notify-channel' || subCommand == 'set-ac-notify-channel') {
                const channel = interaction.options.getChannel('channel');
                if (!channel) {
                    interaction.reply({
                        embeds: [createErrorEmbed(100, { param: 'channel' })],
                        flags: [MessageFlags.Ephemeral],
                    });
                    return;
                }
                if (!interaction.guildId) {
                    interaction.reply({
                        embeds: [createErrorEmbed(101)],
                        flags: [MessageFlags.Ephemeral],
                    });
                    return;
                }
                if (subCommand == 'set-ac-notify-channel') {
                    await Database.getDatabase().discordServerConfig.upsert({
                        where: { id: interaction.guildId },
                        update: {
                            ac_notify_channel: channel.id,
                        },
                        create: {
                            id: interaction.guildId,
                            ac_notify_channel: channel.id,
                        },
                    });
                    interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('Command Success')
                                .setDescription(`AC notification channel has been set to <#${channel.id}>`)
                                .setColor('Green'),
                        ],
                        flags: [MessageFlags.Ephemeral],
                    });
                } else if (subCommand == 'set-contest-notify-channel') {
                    await Database.getDatabase().discordServerConfig.upsert({
                        where: { id: interaction.guildId },
                        update: {
                            contest_notify_channel: channel.id,
                        },
                        create: {
                            id: interaction.guildId,
                            contest_notify_channel: channel.id,
                        },
                    });
                    interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('Command Success')
                                .setDescription(`Contest notification channel has been set to <#${channel.id}>`)
                                .setColor('Green'),
                        ],
                        flags: [MessageFlags.Ephemeral],
                    });
                } else {
                    interaction.reply({
                        embeds: [createErrorEmbed(999)],
                        flags: [MessageFlags.Ephemeral],
                    });
                    return;
                }
            }
        },
    },
];
