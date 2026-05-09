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

  if (!config.VALID_REGIONS.includes(region)) {
    return interaction.reply({
      content: '❌ Región inválida',
      ephemeral: true,
    });
  }

  await interaction.deferReply();

  const puuid = await ranking.fetchPuuid(gameName, tagLine);

  if (!puuid) {
    return interaction.editReply({
      content: `❌ Usuario "${gameName}#${tagLine}" no encontrado en Riot API`,
    });
  }

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
// /ranking
// ==========================================
const rankingCommand = new SlashCommandBuilder()
  .setName('ranking')
  .setDescription('Generar ranking manualmente');

async function executeRanking(interaction) {
  console.log('[COMMAND] /ranking (manual)');

  await interaction.deferReply();

  try {
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
  } catch (err) {
    console.error('[COMMAND] Error ejecutando /ranking:', err);
    return interaction.editReply({
      content: '❌ Error al obtener el ranking. Intenta de nuevo.',
    });
  }
}

// ==========================================
// /diferencia-entre-ranking
// ==========================================
const diferenciaSemanalCommand = new SlashCommandBuilder()
  .setName('diferencia-entre-ranking')
  .setDescription('Ver cambios del ranking entre snapshots');

async function executeDiferenciaSemanal(interaction) {
  console.log('[COMMAND] /diferencia-entre-ranking');

  await interaction.deferReply();

  const { current, previous, currentDate, previousDate } = await storage.getRankingHistory();

  if (!current) {
    return interaction.editReply({
      content: '❌ No hay datos de ranking disponibles aún. Usa /guardar-ranking primero.',
    });
  }

  const soloComparisons = ranking.compareRankings(current.solo, previous?.solo, 'SOLO 5x5');
  const soloEmbed = ranking.formatDifferenceEmbed(soloComparisons, 'SOLO 5x5', currentDate, previousDate);

  const flexComparisons = ranking.compareRankings(current.flex, previous?.flex, 'FLEX 5x5');
  const flexEmbed = ranking.formatDifferenceEmbed(flexComparisons, 'FLEX 5x5', currentDate, previousDate);

  return interaction.editReply({
    embeds: [soloEmbed, flexEmbed],
  });
}

// ==========================================
// /diferencia
// ==========================================
const diferenciaUsuarioCommand = new SlashCommandBuilder()
  .setName('diferencia')
  .setDescription('Ver cambios de un usuario específico')
  .addStringOption(option =>
    option
      .setName('usuario')
      .setDescription('Nombre del usuario')
      .setRequired(true)
  );

async function executeDiferenciaUsuario(interaction) {
  const userName = interaction.options.getString('usuario');

  console.log(`[COMMAND] /diferencia: ${userName}`);

  await interaction.deferReply();

  const { current, previous, currentDate, previousDate } = await storage.getRankingHistory();

  if (!current) {
    return interaction.editReply({
      content: '❌ No hay datos de ranking disponibles aún.',
    });
  }

  const currentSolo = current.solo.find(u => u.name.toLowerCase() === userName.toLowerCase());
  const previousSolo = previous?.solo.find(u => u.name.toLowerCase() === userName.toLowerCase());

  const currentFlex = current.flex.find(u => u.name.toLowerCase() === userName.toLowerCase());
  const previousFlex = previous?.flex.find(u => u.name.toLowerCase() === userName.toLowerCase());

  if (!currentSolo && !currentFlex) {
    return interaction.editReply({
      content: `❌ Usuario "${userName}" no encontrado en el ranking actual.`,
    });
  }

  let description = `**Usuario:** ${userName}\n\n`;

  if (currentSolo) {
    description += `**SOLO 5x5:**\n`;
    description += `Actual: ${currentSolo.tier} ${currentSolo.rank} - ${currentSolo.lp} LP (Posición #${currentSolo.position})\n`;
    
    if (previousSolo) {
      const lpDiff = currentSolo.lp - previousSolo.lp;
      const lpText = lpDiff > 0 ? `+${lpDiff}` : `${lpDiff}`;
      
      description += `Anterior: ${previousSolo.tier} ${previousSolo.rank} - ${previousSolo.lp} LP (Posición #${previousSolo.position})\n`;
      
      if (currentSolo.tier !== previousSolo.tier) {
        description += `📊 Cambio de Tier: ${previousSolo.tier} → ${currentSolo.tier}\n`;
      }
      
      if (currentSolo.rank !== previousSolo.rank) {
        description += `🏆 Cambio de Rank: ${previousSolo.rank} → ${currentSolo.rank}\n`;
      }
      
      description += `💰 Cambio LP: ${lpText} LP\n`;
      
      if (currentSolo.position !== previousSolo.position) {
        const posChange = currentSolo.position < previousSolo.position ? '📈 Subió' : '📉 Bajó';
        description += `${posChange} en posición: #${previousSolo.position} → #${currentSolo.position}\n`;
      }
    } else {
      description += `Anterior: Sin datos\n`;
    }
    
    description += `\n`;
  }

  if (currentFlex) {
    description += `**FLEX 5x5:**\n`;
    description += `Actual: ${currentFlex.tier} ${currentFlex.rank} - ${currentFlex.lp} LP (Posición #${currentFlex.position})\n`;
    
    if (previousFlex) {
      const lpDiff = currentFlex.lp - previousFlex.lp;
      const lpText = lpDiff > 0 ? `+${lpDiff}` : `${lpDiff}`;
      
      description += `Anterior: ${previousFlex.tier} ${previousFlex.rank} - ${previousFlex.lp} LP (Posición #${previousFlex.position})\n`;
      
      if (currentFlex.tier !== previousFlex.tier) {
        description += `📊 Cambio de Tier: ${previousFlex.tier} → ${currentFlex.tier}\n`;
      }
      
      if (currentFlex.rank !== previousFlex.rank) {
        description += `🏆 Cambio de Rank: ${previousFlex.rank} → ${currentFlex.rank}\n`;
      }
      
      description += `💰 Cambio LP: ${lpText} LP\n`;
      
      if (currentFlex.position !== previousFlex.position) {
        const posChange = currentFlex.position < previousFlex.position ? '📈 Subió' : '📉 Bajó';
        description += `${posChange} en posición: #${previousFlex.position} → #${currentFlex.position}\n`;
      }
    } else {
      description += `Anterior: Sin datos\n`;
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0xffa500)
    .setTitle(`📊 Cambios de ${userName}`)
    .setDescription(description)
    .setFooter({ text: `${previousDate} → ${currentDate}` });

  return interaction.editReply({
    embeds: [embed],
  });
}

// ==========================================
// /guardar-ranking
// ==========================================
const guardarRankingCommand = new SlashCommandBuilder()
  .setName('guardar-ranking')
  .setDescription('Guardar snapshot actual del ranking');

async function executeGuardarRanking(interaction) {
  console.log('[COMMAND] /guardar-ranking');

  await interaction.deferReply();

  const users = await storage.listUsers();

  if (users.length === 0) {
    return interaction.editReply({
      content: '❌ No hay usuarios en tracking',
    });
  }

  try {
    const { soloRanking, flexRanking } = await ranking.buildRankingBothQueues(users);
    await storage.saveRankingHistory(soloRanking, flexRanking);

    const { allDates, currentDate } = await storage.getRankingHistory();

    let snapshotsText = '';
    if (allDates.length > 1) {
      snapshotsText = `\nSnapshots guardados:\n`;
      allDates.slice(0, 3).forEach((date, index) => {
        snapshotsText += `${index + 1}. ${date}\n`;
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('✅ Ranking Guardado')
      .setDescription(`Se guardó el snapshot del ranking actual.\n\nFecha: ${currentDate}\nUsuarios: ${users.length}${snapshotsText}`)
      .setFooter({ text: 'Usa /diferencia-entre-ranking para ver los cambios' });

    return interaction.editReply({
      embeds: [embed],
    });
  } catch (err) {
    console.error('[COMMAND] Error guardando ranking:', err);
    return interaction.editReply({
      content: '❌ Error al guardar el ranking',
    });
  }
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
    diferenciaSemanalCommand,
    diferenciaUsuarioCommand,
    guardarRankingCommand,
  ],
  handlers: {
    add_user: executeAddUser,
    remove_user: executeRemoveUser,
    list_users: executeListUsers,
    ranking: executeRanking,
    'diferencia-entre-ranking': executeDiferenciaSemanal,
    diferencia: executeDiferenciaUsuario,
    'guardar-ranking': executeGuardarRanking,
  },
};