import { ChatInputCommandInteraction, Embed, EmbedBuilder, Message, MessageFlags, SlashCommandBuilder } from 'discord.js';
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
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName('link-account')
                    .setDescription('AtCoderアカウントとDiscordアカウントを紐づけます')
                    .addStringOption((text) => text.setName('atcoder-username').setDescription('紐づける AtCoder アカウント名です').setRequired(true))
                    .addUserOption((user) => user.setName('discord-user').setDescription('紐づける Discord アカウントです').setRequired(false)),
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
            if (!interaction.guildId) {
                interaction.reply({
                    embeds: [createErrorEmbed(101)],
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
            } else if (subCommand == 'link-account') {
                const AtCoderUser = interaction.options.getString('atcoder-username');
                if (!AtCoderUser) {
                    interaction.reply({
                        embeds: [createErrorEmbed(100, { param: 'atcoder-username' })],
                        flags: [MessageFlags.Ephemeral],
                    });
                    return;
                }
                const DiscordUser = interaction.options.getUser('discord-user') || interaction.user;
                const atcoderUserId = await Database.getDatabase().user.findUnique({
                    where: {
                        name: AtCoderUser,
                    },
                });
                if (!atcoderUserId) {
                    interaction.reply({
                        embeds: [createErrorEmbed(102, { user: AtCoderUser })],
                        flags: [MessageFlags.Ephemeral],
                    });
                    return;
                }
                await Database.getDatabase().discordServerConfig.upsert({
                    where: { id: interaction.guildId },
                    update: {},
                    create: {
                        id: interaction.guildId,
                    },
                });
                const first = await Database.getDatabase().discordServerLinkedAccount.findFirst({
                    where: {
                        LinkDiscordGuildId: interaction.guildId,
                        DiscordAccountId: DiscordUser.id,
                    },
                });
                if (first) {
                    await Database.getDatabase().discordServerLinkedAccount.deleteMany({
                        where: {
                            LinkDiscordGuildId: interaction.guildId,
                            DiscordAccountId: DiscordUser.id,
                        },
                    });
                }
                await Database.getDatabase().discordServerLinkedAccount.create({
                    data: {
                        LinkDiscordGuildId: interaction.guildId,
                        AtCoderUserId: atcoderUserId.id,
                        DiscordAccountId: DiscordUser.id,
                    },
                });
                interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('Command Success')
                            .setDescription(`The discord account <@${DiscordUser.id}> and the atcoder user \`${AtCoderUser}\` were linked.`),
                    ],
                    flags: [MessageFlags.Ephemeral],
                });
            }
        },
    },
];
