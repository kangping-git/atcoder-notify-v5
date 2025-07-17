import { EmbedBuilder } from 'discord.js';

const ErrorCodes: Record<number, string> = {
    100: "Required parameter ':param:' is null.",
    101: 'This command can only be executed within a server.',
    102: "Can't find an atcoder user ':user:'",
    999: 'Unknown Error',
};

export function createErrorEmbed(errorCode: number, format: Record<string, string> = {}) {
    let errorMsg = ErrorCodes[errorCode];
    if (!errorMsg) {
        errorMsg = ErrorCodes[999];
    }
    for (let key in format) {
        errorMsg = errorMsg.split(':' + key + ':').join(format[key]);
    }
    const embed = new EmbedBuilder()
        .setTitle('Error Occurred (Error Code: ' + errorCode + ')')
        .setDescription(errorMsg)
        .setColor('Red');
    return embed;
}
