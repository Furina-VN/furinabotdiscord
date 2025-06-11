const { SlashCommandBuilder } = require('discord.js');
const furinaVN = require('../language/furina_vn');
const furinaEN = require('../language/furina_en');
const fs = require('fs').promises;
const path = require('path');

// Function to get message based on language
function getMessage(language, messageKey) {
    switch (language) {
        case 'en':
            return furinaEN[messageKey];
        case 'vn':
        default:
            return furinaVN[messageKey];
    }
}

// Function to get chat history file path for a user
function getUserChatHistoryPath(userId) {
    return path.join(__dirname, `../data/chat_history_${userId}.json`);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-chat')
        .setDescription('Reset your chat history with Furina'),

    async execute(interaction) {
        try {
            const userLanguage = interaction.client.userLanguage?.get(interaction.user.id) || 'vn';
            
            // Create confirmation buttons
            const confirmButton = {
                type: 2, // Button type
                style: 4, // Danger style (red)
                custom_id: 'confirm_reset',
                label: 'Confirm',
            };

            const cancelButton = {
                type: 2, // Button type
                style: 2, // Secondary style (gray)
                custom_id: 'cancel_reset',
                label: 'Cancel',
            };

            // Send confirmation message with buttons
            const confirmMessage = await interaction.reply({
                content: getMessage(userLanguage, 'RESET_CHAT_CONFIRM'),
                components: [{
                    type: 1, // Action Row
                    components: [confirmButton, cancelButton]
                }],
                ephemeral: true
            });

            // Create collector for button interactions
            const filter = i => i.user.id === interaction.user.id;
            const collector = confirmMessage.createMessageComponentCollector({ 
                filter, 
                time: 30000 // 30 seconds timeout
            });

            collector.on('collect', async i => {
                if (i.customId === 'confirm_reset') {
                    try {
                        const chatHistoryPath = getUserChatHistoryPath(interaction.user.id);
                        await fs.writeFile(chatHistoryPath, JSON.stringify({ chats: [] }, null, 2));
                        
                        await i.update({
                            content: getMessage(userLanguage, 'RESET_CHAT_SUCCESS'),
                            components: []
                        });
                    } catch (error) {
                        console.error('Error resetting chat history:', error);
                        await i.update({
                            content: getMessage(userLanguage, 'RESET_CHAT_ERROR'),
                            components: []
                        });
                    }
                } else if (i.customId === 'cancel_reset') {
                    await i.update({
                        content: getMessage(userLanguage, 'RESET_CHAT_CANCELLED'),
                        components: []
                    });
                }
            });

            collector.on('end', async collected => {
                if (collected.size === 0) {
                    await interaction.editReply({
                        content: getMessage(userLanguage, 'RESET_CHAT_CANCELLED'),
                        components: []
                    });
                }
            });

        } catch (error) {
            console.error('Error in reset-chat command:', error);
            const userLanguage = interaction.client.userLanguage?.get(interaction.user.id) || 'vn';
            await interaction.reply({
                content: getMessage(userLanguage, 'RESET_CHAT_ERROR'),
                ephemeral: true
            });
        }
    }
}; 