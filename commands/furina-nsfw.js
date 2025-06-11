const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { SlashCommandBuilder, EmbedBuilder,MessageFlags } = require('discord.js');

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
    .setDescription('Hiển thị ảnh Furina (nsfw)'),

  async execute(interaction) {
  if (!interaction.channel.nsfw) {
    return interaction.reply({
      content: '⚠️ Dùng lệnh này trong kênh NSFW thôi nhen~',
      flags: MessageFlags.Ephemeral // hoặc flags: 64 nếu không muốn import
    });
  }

    const userId = interaction.user.id;
    const seenIds = history[userId] || [];

    try {
      const query = 'furina_(genshin_impact)';
      const url = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${encodeURIComponent(query)}`;
      const res = await axios.get(url);
      const data = res.data;

      if (!Array.isArray(data) || data.length === 0) {
        return interaction.reply('😵 Không tìm thấy ảnh Furina nào.');
      }

      const unseen = data.filter(post => !seenIds.includes(post.id));

      let chosen;
      if (unseen.length > 0) {
        chosen = unseen[Math.floor(Math.random() * unseen.length)];
        history[userId] = [...seenIds, chosen.id];
        saveHistory();
      } else {
        // Nếu đã xem hết thì gửi lại 1 ảnh cũ bất kỳ
        chosen = data[Math.floor(Math.random() * data.length)];
        await interaction.reply('👀 Bạn đã xem hết ảnh mới rồi~ Đây là ảnh cũ nè!');
      }

      const embed = new EmbedBuilder()
        .setTitle('📷 Ảnh của Furina de Fontaine')
        .setImage(chosen.file_url)
        .setURL(`https://discord.gg/jtCrdcvbeR`)
        .setFooter({ text: `Nhấn vào link để xem chi tiết` });

      return interaction.channel.send({ embeds: [embed] });

    } catch (err) {
      console.error('[LỖI API]:', err.message);
      return interaction.reply('Có lỗi khi lấy hình ảnh, vui lòng thử lại sau');
    }
  }
};
