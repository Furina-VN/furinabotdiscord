require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, Events, Partials } = require('discord.js');
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
    partials: [Partials.Channel] // Nhận tin nhắn từ DM
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

// === 5. Đăng ký listener tin nhắn DM & server ===
const messageListener = require('./events/messageListener');
client.on(Events.MessageCreate, async (message) => {
    try {
        await messageListener.execute(message);
    } catch (error) {
        console.error('❌ Lỗi khi xử lý tin nhắn:', error);
    }
});

// === 6. Express server giữ bot sống trên Render ===
const app = express();
const PORT = process.env.PORT || 10001;

app.get('/', (req, res) => {
    res.send('🤖 Bot is running!');
});

app.listen(PORT, () => {
    console.log(`🌐 Express server đang chạy tại cổng ${PORT}`);
});

// === 7. Đăng nhập bot (và đảm bảo in log đúng trên Render) ===
async function main() {
    try {
        console.log('🔑 Token hiện tại là:', process.env.DISCORD_TOKEN ? 'Đã nhận được ✅' : 'KHÔNG nhận được ❌');
        await client.login(process.env.DISCORD_TOKEN);
        console.log(`🤖 Bot đã đăng nhập với tên: ${client.user.tag}`);
        console.log(`🔗 Mời bot: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&scope=bot+applications.commands&permissions=8`);
    } catch (err) {
        console.error('❌ Lỗi khi đăng nhập bot:', err);
    }
}

main();
