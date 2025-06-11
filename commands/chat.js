const { SlashCommandBuilder } = require('discord.js');
const { generateResponse } = require('../config/aiConfig');
const furinaHelpers = require('../utils/furinaHelpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chat')
        .setDescription('Chat with Furina')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Your message to Furina')
                .setRequired(true)),

    async execute(interaction) {
        let deferred = false;
        try {
            await interaction.deferReply();
            deferred = true;

            const message = interaction.options.getString('message');
            const userLanguage = interaction.client.userLanguage?.get(interaction.user.id) || 'vn';
            const systemPrompt = furinaHelpers.getPrompt(userLanguage);

            try {
                // Get chat context
                const chatContext = await furinaHelpers.getChatContext(interaction.user.id);
                
                // Enhance prompt with context
                const enhancedPrompt = furinaHelpers.enhancePromptWithContext(
                    systemPrompt,
                    chatContext,
                    message,
                    userLanguage
                );

                const response = await generateResponse(message, enhancedPrompt, userLanguage);
                await interaction.editReply(response);
                
                // Save chat history
                await furinaHelpers.saveChatHistory(
                    interaction.user.id,
                    interaction.user.username,
                    message,
                    response,
                    userLanguage
                );
            } catch (error) {
                console.error('Error generating response:', error);
                const errorMessage = furinaHelpers.getErrorMessage(userLanguage);
                await interaction.editReply(errorMessage);
            }
        } catch (error) {
            console.error('Error in chat command:', error);
            
            try {
                if (!deferred && !interaction.replied) {
                    await interaction.reply({
                        content: '💧 Có lỗi xảy ra khi thực hiện lệnh này!',
                        ephemeral: true
                    });
                } else if (!interaction.replied) {
                    await interaction.editReply('💧 Có lỗi xảy ra khi thực hiện lệnh này!');
                }
            } catch (err) {
                console.error('Error sending fallback error message:', err);
            }
        }
    }
};
