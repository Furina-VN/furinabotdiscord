require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, Events,Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');

// === 1. Tạo Discord Client ===
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel] // Để nhận được tin nhắn từ DM (Direct Message)
});

// === 2. Load Slash Commands ===
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commands = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        console.log(`✅ Đã load lệnh: ${command.data.name}`);
    } else {
        console.log(`⚠️ [WARNING] Lệnh ở ${filePath} thiếu "data" hoặc "execute".`);
    }
}

// === 3. Đăng ký Slash Commands toàn cục ===
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try {
        console.log('🚀 Bắt đầu làm mới các slash command toàn cục...');
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log(`🎉 Đã đăng ký ${data.length} slash command thành công.`);
        console.log('⏳ Có thể mất vài phút để hiển thị trên Discord.');
    } catch (error) {
        console.error('❌ Lỗi khi đăng ký lệnh:', error);
    }
})();

// === 4. Xử lý sự kiện tương tác Slash Command ===
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`❌ Không tìm thấy lệnh: ${interaction.commandName}`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`❌ Lỗi khi thực thi lệnh ${interaction.commandName}:`, error);
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: '⚠️ Có lỗi xảy ra khi thực hiện lệnh này!', ephemeral: true });
            } else {
                await interaction.reply({ content: '⚠️ Có lỗi xảy ra khi thực hiện lệnh này!', ephemeral: true });
            }
        } catch (err) {
            console.error('❌ Lỗi khi gửi phản hồi lỗi:', err);
        }
    }
});

// === 5. Đăng ký message listener cho cả DM & server ===
const messageListener = require('./events/messageListener');
client.on(Events.MessageCreate, async (message) => {
    try {
        await messageListener.execute(message);
    } catch (error) {
        console.error('❌ Lỗi khi xử lý tin nhắn:', error);
    }
});

// === 6. Sự kiện bot sẵn sàng ===
client.once(Events.ClientReady, () => {
    console.log(`🤖 Bot đã đăng nhập với tên: ${client.user.tag}`);
});

// === 7. Đăng nhập vào Discord ===
client.login(process.env.DISCORD_TOKEN);

// === 8. Express server giữ bot luôn hoạt động (dành cho Render, Replit, v.v.) ===
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🤖 Bot is running!');
});

app.listen(PORT, () => {
    console.log(`🌐 Express server đang chạy tại cổng ${PORT}`);
});
