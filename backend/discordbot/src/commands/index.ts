import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';

function buildAboutEmbed(latency?: number) {
    const embed = new EmbedBuilder().setTitle('AtCoder Notify Bot');
    embed.setDescription('このボットは、AtCoderのコンテストや問題の通知を提供します。');
    embed.addFields(
        { name: 'Developer', value: 'Kangping', inline: true },
        { name: 'Version', value: '5.0.0', inline: true },
        { name: 'Homepage', value: 'https://kyo-pro.club/', inline: true },
        {
            name: 'Latency',
            value: '`' + (latency ?? '-') + ' ms`',
            inline: true,
        },
    );
    return embed;
}

export default [
    {
        data: new SlashCommandBuilder().setName('about').setDescription('Botの情報を表示します。'),
        async execute(interaction: ChatInputCommandInteraction) {
            const embed = buildAboutEmbed();
            interaction.reply({ embeds: [embed] });
            let msg = await interaction.fetchReply();
            const latency = msg.createdTimestamp - interaction.createdTimestamp;
            msg = await msg.edit({ embeds: [buildAboutEmbed(latency)] });
        },
    },
];
