const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// Hàm lấy đường dẫn file lịch sử chat
function getUserChatHistoryPath(userId) {
    return path.join(__dirname, `../data/chat_history_${userId}.json`);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('language')
        .setDescription('Thay đổi ngôn ngữ của Furina')
        .addStringOption(option =>
            option.setName('lang')
                .setDescription('Ngôn ngữ bạn muốn sử dụng')
                .setRequired(true)
                .addChoices(
                    { name: 'Tiếng Việt', value: 'vn' },
                    { name: 'English', value: 'en' }
                )),

    async execute(interaction) {
        const lang = interaction.options.getString('lang');

        if (!interaction.client.userLanguage) {
            interaction.client.userLanguage = new Map();
        }

        const currentLang = interaction.client.userLanguage.get(interaction.user.id) || 'vn';

        // Nếu ngôn ngữ giống nhau thì phản hồi như thường
        if (lang === currentLang) {
            const message = lang === 'vn'
                ? '💧 Tôi đã nói tiếng Việt với bạn rồi mà.'
                : '💧 I am already speaking English with you.';
            return interaction.reply({ content: message, ephemeral: true });
        }

        // Nếu ngôn ngữ khác nhau, hiển thị cảnh báo
        const confirmButton = {
            type: 2,
            style: 4,
            custom_id: 'confirm_language_change',
            label: lang === 'vn' ? 'Đồng ý' : 'Confirm',
        };

        const cancelButton = {
            type: 2,
            style: 2,
            custom_id: 'cancel_language_change',
            label: lang === 'vn' ? 'Hủy' : 'Cancel',
        };

        const warningMessage = lang === 'vn'
            ? '⚠️ Việc thay đổi ngôn ngữ sẽ xóa toàn bộ lịch sử chat hiện tại. Bạn có chắc chắn muốn tiếp tục?'
            : '⚠️ Changing the language will delete all your current chat history. Are you sure you want to continue?';

        const replyMessage = await interaction.reply({
            content: warningMessage,
            components: [{
                type: 1,
                components: [confirmButton, cancelButton]
            }],
            ephemeral: true
        });

        const filter = i => i.user.id === interaction.user.id;
        const collector = replyMessage.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async i => {
            if (i.customId === 'confirm_language_change') {
                // Thay đổi ngôn ngữ
                interaction.client.userLanguage.set(interaction.user.id, lang);

                // Xóa lịch sử chat
                const chatHistoryPath = getUserChatHistoryPath(interaction.user.id);
                await fs.writeFile(chatHistoryPath, JSON.stringify({ chats: [] }, null, 2));

                const successMessage = lang === 'vn'
                    ? '✅ Đã đổi ngôn ngữ sang Tiếng Việt và xóa lịch sử chat.'
                    : '✅ Language changed to English and chat history reset.';

                await i.update({
                    content: successMessage,
                    components: []
                });

            } else if (i.customId === 'cancel_language_change') {
                const cancelMessage = lang === 'vn'
                    ? '💧 Hủy thay đổi ngôn ngữ.'
                    : '💧 Language change canceled.';

                await i.update({
                    content: cancelMessage,
                    components: []
                });
            }
        });

        collector.on('end', async collected => {
            if (collected.size === 0) {
                await interaction.editReply({
                    content: lang === 'vn'
                        ? '⏳ Hết thời gian xác nhận. Không thay đổi ngôn ngữ.'
                        : '⏳ Confirmation timed out. No language change was made.',
                    components: []
                });
            }
        });
    }
};
