const axios = require('axios');
const config = require('./config');

// ==========================================
// Cliente HTTP con timeout
// ==========================================
const riotClient = axios.create({
  timeout: config.TIMEOUT_API,
  headers: {
    'X-Riot-Token': config.RIOT_API_KEY,
  },
});

// ==========================================
// Obtener PUUID desde gameName + tagLine
// ==========================================
async function fetchPuuid(gameName, tagLine) {
  try {
    const url = `${config.RIOT_ACCOUNT_API}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    const response = await riotClient.get(url);
    console.log(`[RANKING] ✅ PUUID obtenido: ${gameName}#${tagLine}`);
    return response.data.puuid;
  } catch (err) {
    if (err.response?.status === 404) {
      console.log(`[RANKING] ❌ Usuario no encontrado: ${gameName}#${tagLine}`);
      return null;
    }
    console.error(`[RANKING] Error fetching PUUID para ${gameName}#${tagLine}:`, err.message);
    return null;
  }
}

// ==========================================
// Obtener TODAS las queues de un usuario
// ==========================================
async function fetchAllQueueStats(puuid, gameName, region) {
  try {
    // Obtener plataforma desde región
    const platform = config.REGION_TO_PLATFORM[region.toUpperCase()];
    if (!platform) {
      throw new Error(`Región inválida: ${region}`);
    }
    
    const url = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
    
    console.log(`[RANKING] DEBUG - URL: ${url}`);
    console.log(`[RANKING] DEBUG - Platform: ${platform}, Región: ${region}`);
    
    const response = await riotClient.get(url);
    
    console.log(`[RANKING] DEBUG - Response status: ${response.status}`);
    console.log(`[RANKING] DEBUG - Response data (completo):`, JSON.stringify(response.data, null, 2));
    console.log(`[RANKING] DEBUG - Array length: ${response.data?.length}`);
    
    return response.data;
  } catch (err) {
    console.log(`[RANKING] DEBUG - Error status: ${err.response?.status}`);
    console.log(`[RANKING] DEBUG - Error data:`, err.response?.data);
    console.error(`[RANKING] Error fetching stats para ${gameName}:`, err.message);
    return [];
  }
}
// ==========================================
// Calcular winrate (retorna objeto con %, wins, losses)
// ==========================================
function calculateWinrate(wins, losses) {
  if (wins === 0 && losses === 0) {
    return {
      percentage: '0%',
      wins: 0,
      losses: 0,
      text: '0% (0W-0L)'
    };
  }
  const percentage = ((wins / (wins + losses)) * 100).toFixed(1);
  return {
    percentage: `${percentage}%`,
    wins: wins,
    losses: losses,
    text: `${percentage}% (${wins}W-${losses}L)`
  };
}

// ==========================================
// Extraer y formatear SOLO + FLEX
// ==========================================
function extractAndFormatQueues(statsArray, gameName) {
  
  const solo = statsArray.find(q => {
    return q.queueType === config.TRACKED_QUEUES.SOLO;
  });
  
  const flex = statsArray.find(q => q.queueType === config.TRACKED_QUEUES.FLEX);

  const soloData = solo ? {
    name: gameName,
    tier: solo.tier,
    rank: solo.rank,
    lp: solo.leaguePoints,
    winrate: calculateWinrate(solo.wins, solo.losses),
    wins: solo.wins,
    losses: solo.losses,
  } : {
    name: gameName,
    tier: 'UNRANKED',
    rank: '-',
    lp: 0,
    winrate: calculateWinrate(0, 0),
    wins: 0,
    losses: 0,
  };

  const flexData = flex ? {
    name: gameName,
    tier: flex.tier,
    rank: flex.rank,
    lp: flex.leaguePoints,
    winrate: calculateWinrate(flex.wins, flex.losses),
    wins: flex.wins,
    losses: flex.losses,
  } : {
    name: gameName,
    tier: 'UNRANKED',
    rank: '-',
    lp: 0,
    winrate: calculateWinrate(0, 0),
    wins: 0,
    losses: 0,
  };

  return { soloData, flexData };
}

// ==========================================
// Construir ranking AMBAS queues
// ==========================================
async function buildRankingBothQueues(users) {
  const soloRanking = [];
  const flexRanking = [];

  console.log(`[RANKING] Obteniendo stats de ${users.length} usuarios...`);

  for (const user of users) {
    try {
      // Pasar región a fetchAllQueueStats
      const stats = await fetchAllQueueStats(user.puuid, `${user.game_name}#${user.tag_line}`, user.region);
      const { soloData, flexData } = extractAndFormatQueues(stats, user.game_name);

      soloRanking.push(soloData);
      flexRanking.push(flexData);
    } catch (err) {
      console.error(`[RANKING] Error procesando ${user.game_name}#${user.tag_line}:`, err);
    }
  }

  // Ordenar por LP descendente
  soloRanking.sort((a, b) => b.lp - a.lp);
  flexRanking.sort((a, b) => a.lp - b.lp);

  console.log(`[RANKING] ✅ Rankings construidos - ${soloRanking.length} usuarios`);
  return { soloRanking, flexRanking };
}
// ==========================================
// Emoji por tier
// ==========================================
function getTierEmoji(tier) {
  const tiers = {
    'IRON': '⬛',
    'BRONZE': '🟠',
    'SILVER': '⚪',
    'GOLD': '🟡',
    'PLATINUM': '🔷',
    'EMERALD': '💚',
    'DIAMOND': '💎',
    'MASTER': '👑',
    'GRANDMASTER': '🌟',
    'CHALLENGER': '⭐',
    'UNRANKED': '❓'
  };
  return tiers[tier] || '❓';
}

// ==========================================
// Formatear DOS embeds (LÍNEA ÚNICA CON W-L)
// ==========================================
function formatRankingEmbeds(soloRanking, flexRanking) {
  // ===== EMBED SOLO =====
  let soloDescription = '';
  if (soloRanking.length === 0) {
    soloDescription = 'No hay datos disponibles';
  } else {
    soloRanking.forEach((entry, index) => {
      const emoji = getTierEmoji(entry.tier);
      const winrateText = entry.winrate.text;
      soloDescription += `**${index + 1}.** ${emoji} ${entry.name} - ${entry.tier} ${entry.rank} - **${entry.lp} LP** - ${winrateText}\n`;
    });
  }

  const embedSolo = {
    color: 0x0099ff,
    title: '🏆 RANKING SOLO 5x5',
    description: soloDescription,
    footer: {
      text: `Actualizado: ${new Date().toLocaleString('es-AR')}`,
    },
  };

  // ===== EMBED FLEX =====
  let flexDescription = '';
  if (flexRanking.length === 0) {
    flexDescription = 'No hay datos disponibles';
  } else {
    flexRanking.forEach((entry, index) => {
      const emoji = getTierEmoji(entry.tier);
      const winrateText = entry.winrate.text;
      flexDescription += `**${index + 1}.** ${emoji} ${entry.name} - ${entry.tier} ${entry.rank} - **${entry.lp} LP** - ${winrateText}\n`;
    });
  }

  const embedFlex = {
    color: 0xff6b6b,
    title: '🎭 RANKING FLEX 5x5',
    description: flexDescription,
    footer: {
      text: `Actualizado: ${new Date().toLocaleString('es-AR')}`,
    },
  };

  return [embedSolo, embedFlex];
}

module.exports = {
  fetchPuuid,
  fetchAllQueueStats,
  calculateWinrate,
  extractAndFormatQueues,
  buildRankingBothQueues,
  formatRankingEmbeds,
};