const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const historyPath = path.join(__dirname, '../data/furina-nsfw_history.json');
let history = {};

if (fs.existsSync(historyPath)) {
  history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
}

function saveHistory() {
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('furina-nsfw')
    .setDescription('Hiển thị ảnh Furina (NSFW)'),

  async execute(interaction) {
    if (!interaction.channel.nsfw) {
      return interaction.reply({
        content: '⚠️ Dùng lệnh này trong kênh NSFW thôi nhen~',
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply();

    const userId = interaction.user.id;
    const seenIds = history[userId] || [];

    try {
      const query = 'furina_(genshin)';
      const MAX_PAGES = 20;
      const MAX_TRIES = 5;
      let chosen = null;

      for (let i = 0; i < MAX_TRIES; i++) {
        const randomPage = Math.floor(Math.random() * MAX_PAGES) + 1;
        const url = `https://yande.re/post.json?limit=100&page=${randomPage}&tags=${encodeURIComponent(query)}`;
        const res = await axios.get(url);
        const data = res.data;

        if (!Array.isArray(data) || data.length === 0) continue;

        const unseen = data.filter(post => !seenIds.includes(post.id));
        if (unseen.length > 0) {
          chosen = unseen[Math.floor(Math.random() * unseen.length)];
          history[userId] = [...seenIds, chosen.id];
          saveHistory();
          break;
        }
      }

      // Fallback nếu không có ảnh mới
      if (!chosen) {
        const fallbackUrl = `https://yande.re/post.json?limit=100&page=1&tags=${encodeURIComponent(query)}`;
        const res = await axios.get(fallbackUrl);
        const data = res.data;

        if (!Array.isArray(data) || data.length === 0) {
          return interaction.editReply('😵 Không tìm thấy ảnh Furina nào.');
        }

        chosen = data[Math.floor(Math.random() * data.length)];
        await interaction.editReply('👀 Bạn đã xem hết ảnh mới rồi~ Đây là ảnh cũ nè!');
      }

      // Debug để kiểm tra
      console.log(`[DEBUG] ID: ${chosen.id}`);
      console.log(`[DEBUG] file_url: ${chosen.file_url}`);
      console.log(`[DEBUG] sample_url: ${chosen.sample_url}`);

      const imageUrl = chosen.sample_url || chosen.file_url;
      if (!imageUrl) {
        return interaction.editReply('🚫 Không thể lấy ảnh từ Yande.re.');
      }

      const embed = new EmbedBuilder()
        .setTitle('📷 Ảnh NSFW Furina')
        .setImage(imageUrl)
        .setURL(`https://discord.gg/jtCrdcvbeR`)
        .setDescription('Lưu ý: Ảnh có thể load chậm do Internet')
        .setFooter({ text: `Có thể ảnh không phải NSFW do lọc quá nhiều` });
       
      return interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error('[LỖI API]:', err.message);
      return interaction.editReply('🚫 Có lỗi khi lấy hình ảnh, vui lòng thử lại sau.');
    }
  }
}; 