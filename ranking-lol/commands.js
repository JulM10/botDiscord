const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const storage = require('./storage');
const ranking = require('./ranking');
const config = require('./config');

// ==========================================
// /add_user
// ==========================================
const addUserCommand = new SlashCommandBuilder()
  .setName('add_user')
  .setDescription('Agregar un usuario al ranking LOL')
  .addStringOption(option =>
    option
      .setName('game_name')
      .setDescription('Tu nombre en Riot')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('tag_line')
      .setDescription('Tu tag')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('region')
      .setDescription('Tu región')
      .setRequired(true)
      .addChoices(
        { name: 'NA', value: 'NA' },
        { name: 'BR', value: 'BR' },
        { name: 'LAS', value: 'LAS' },
        { name: 'LAN', value: 'LAN' },
        { name: 'EUW', value: 'EUW' },
        { name: 'EUNE', value: 'EUNE' },
        { name: 'KR', value: 'KR' }
      )
  );

async function executeAddUser(interaction) {
  const gameName = interaction.options.getString('game_name');
  const tagLine = interaction.options.getString('tag_line');
  const region = interaction.options.getString('region');

  console.log(`[COMMAND] /add_user: ${gameName}#${tagLine} (${region})`);

  // Validar región
  if (!config.VALID_REGIONS.includes(region)) {
    return interaction.reply({
      content: '❌ Región inválida',
      ephemeral: true,
    });
  }

  await interaction.deferReply();

  // Obtener PUUID
  const puuid = await ranking.fetchPuuid(gameName, tagLine);

  if (!puuid) {
    return interaction.editReply({
      content: `❌ Usuario "${gameName}#${tagLine}" no encontrado en Riot API`,
    });
  }

  // Agregar a JSON (ahora con región)
  const result = await storage.addUser(gameName, tagLine, region, puuid);

  return interaction.editReply({
    content: result.message,
  });
}

// ==========================================
// /remove_user
// ==========================================
const removeUserCommand = new SlashCommandBuilder()
  .setName('remove_user')
  .setDescription('Remover un usuario del ranking')
  .addStringOption(option =>
    option
      .setName('game_name')
      .setDescription('Nombre en Riot')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('tag_line')
      .setDescription('Tag del usuario')
      .setRequired(true)
  );

async function executeRemoveUser(interaction) {
  const gameName = interaction.options.getString('game_name');
  const tagLine = interaction.options.getString('tag_line');

  console.log(`[COMMAND] /remove_user: ${gameName}#${tagLine}`);

  const result = await storage.removeUser(gameName, tagLine);

  return interaction.reply({
    content: result.message,
    ephemeral: true,
  });
}

// ==========================================
// /list_users
// ==========================================
const listUsersCommand = new SlashCommandBuilder()
  .setName('list_users')
  .setDescription('Ver usuarios en tracking');

async function executeListUsers(interaction) {
  console.log('[COMMAND] /list_users');

  const users = await storage.listUsers();

  if (users.length === 0) {
    return interaction.reply({
      content: 'No hay usuarios en tracking',
      ephemeral: true,
    });
  }

  let description = '';
  users.forEach((u, i) => {
    description += `**${i + 1}.** ${u.game_name}#${u.tag_line} (${u.region})\n`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle('👥 Usuarios en Tracking')
    .setDescription(description)
    .setFooter({ text: `Total: ${users.length}/${config.MAX_USERS}` });

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

// ==========================================
// /ranking (Manual para testing)
// ==========================================
const rankingCommand = new SlashCommandBuilder()
  .setName('ranking')
  .setDescription('Generar ranking manualmente');

async function executeRanking(interaction) {
  console.log('[COMMAND] /ranking (manual)');

  await interaction.deferReply();

  const users = await storage.listUsers();

  if (users.length === 0) {
    return interaction.editReply({
      content: 'No hay usuarios en tracking',
    });
  }

  const { soloRanking, flexRanking } = await ranking.buildRankingBothQueues(users);
  const [embedSolo, embedFlex] = ranking.formatRankingEmbeds(soloRanking, flexRanking);

  return interaction.editReply({
    embeds: [embedSolo, embedFlex],
  });
}

// ==========================================
// Exportar
// ==========================================
module.exports = {
  commands: [
    addUserCommand,
    removeUserCommand,
    listUsersCommand,
    rankingCommand,
  ],
  handlers: {
    add_user: executeAddUser,
    remove_user: executeRemoveUser,
    list_users: executeListUsers,
    ranking: executeRanking,
  },
};