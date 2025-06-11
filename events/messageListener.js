const { Events, ChannelType } = require('discord.js');
const { generateResponse } = require('../config/aiConfig');
const furinaHelpers = require('../utils/furinaHelpers');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        console.log('📩 Message received:', {
            content: message.content,
            channelType: message.channel.type,
            author: message.author.tag,
            isDM: message.channel.type === ChannelType.DM
        });

        // Bỏ qua tin nhắn từ bot
        if (message.author.bot) {
            console.log('⛔ Bỏ qua tin nhắn bot');
            return;
        }

        const client = message.client;
        const userId = message.author.id;
        const userLanguage = client.userLanguage?.get(userId) || 'vn';

        // Xử lý tin nhắn DM
        if (message.channel.type === ChannelType.DM) {
            console.log('📨 Xử lý DM...');
            try {
                await message.channel.sendTyping();

                const systemPrompt = furinaHelpers.getPrompt(userLanguage);
                const chatContext = await furinaHelpers.getChatContext(userId);

                const enhancedPrompt = furinaHelpers.enhancePromptWithContext(
                    systemPrompt,
                    chatContext,
                    message.content,
                    userLanguage
                );

                const response = await generateResponse(message.content, enhancedPrompt, userLanguage);
                await message.reply(response);

                await furinaHelpers.saveChatHistory(
                    userId,
                    message.author.username,
                    message.content,
                    response,
                    userLanguage
                );
            } catch (error) {
                console.error('❌ Lỗi xử lý DM:', error);
                const errorMessage = furinaHelpers.getErrorMessage(userLanguage);
                await message.reply(errorMessage);
            }
            return;
        }

        // Xử lý tin nhắn trên máy chủ
        const isMentioned = message.mentions.users.has(client.user.id);
        const hasFurinaName = message.content.toLowerCase().includes('furina');
        let isReplyToFurina = false;

        if (message.reference?.messageId) {
            try {
                const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
                isReplyToFurina = repliedMessage.author.id === client.user.id;
            } catch (error) {
                console.warn('⚠️ Không thể lấy tin nhắn đã trả lời:', error);
            }
        }

        if (isMentioned || isReplyToFurina || hasFurinaName) {
            console.log('💬 Xử lý tin nhắn máy chủ:', {
                isMentioned,
                isReplyToFurina,
                hasFurinaName
            });

            try {
                await message.channel.sendTyping();

                const systemPrompt = furinaHelpers.getPrompt(userLanguage);
                const chatContext = await furinaHelpers.getChatContext(userId);

                let enhancedMessage = message.content;
                if (isMentioned) {
                    enhancedMessage = `[Mention trực tiếp] ${message.content}`;
                } else if (isReplyToFurina) {
                    enhancedMessage = `[Phản hồi tin nhắn Furina] ${message.content}`;
                } else if (hasFurinaName) {
                    enhancedMessage = `[Gọi tên Furina] ${message.content}`;
                }

                const enhancedPrompt = furinaHelpers.enhancePromptWithContext(
                    systemPrompt,
                    chatContext,
                    enhancedMessage,
                    userLanguage
                );

                const response = await generateResponse(enhancedMessage, enhancedPrompt, userLanguage);
                await message.reply(response);

                await furinaHelpers.saveChatHistory(
                    userId,
                    message.author.username,
                    message.content,
                    response,
                    userLanguage
                );
            } catch (error) {
                console.error('❌ Lỗi xử lý message server:', error);
                const errorMessage = furinaHelpers.getErrorMessage(userLanguage);
                await message.reply(errorMessage);
            }
        }
    }
};
