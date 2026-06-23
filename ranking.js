const axios = require('axios');
const config = require('./config');

// ==========================================
// Mapeo de tier a valor numérico
// ==========================================
const TIER_VALUES = {
  'CHALLENGER': 8,
  'GRANDMASTER': 7,
  'MASTER': 6,
  'DIAMOND': 5,
  'EMERALD': 4,
  'PLATINUM': 3,
  'GOLD': 2,
  'SILVER': 1,
  'BRONZE': 0.5,
  'IRON': 0.25,
  'UNRANKED': 0
};

// Mapeo de rank a valor
const RANK_VALUES = {
  'I': 4,
  'II': 3,
  'III': 2,
  'IV': 1
};

// ==========================================
// Función de comparación jerárquica
// ==========================================
function compareRanking(a, b) {
  // 1. Comparar por tier (descendente)
  const tierValueA = TIER_VALUES[a.tier] || 0;
  const tierValueB = TIER_VALUES[b.tier] || 0;
  
  if (tierValueA !== tierValueB) {
    return tierValueB - tierValueA;
  }

  // 2. Si mismo tier, comparar por rank
  const rankValueA = RANK_VALUES[a.rank] || 0;
  const rankValueB = RANK_VALUES[b.rank] || 0;
  
  if (rankValueA !== rankValueB) {
    return rankValueB - rankValueA;
  }

  // 3. Si mismo tier/rank, comparar por LP
  if (a.lp !== b.lp) {
    return b.lp - a.lp;
  }

  // 4. Si todo igual, comparar por winrate
  const wrA = parseFloat(a.winrate.percentage);
  const wrB = parseFloat(b.winrate.percentage);
  
  return wrB - wrA;
}

// ==========================================
// Cliente HTTP con timeout
// ==========================================
const riotClient = axios.create({
  timeout: config.TIMEOUT_API || 10000,  // 10 segundos
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
    // la api se llama league-v4
    const url = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
    
    console.log(`[RANKING] Fetching stats con plataforma: ${platform} (región: ${region})`);
    
    const response = await riotClient.get(url);
    console.log(`[RANKING] ✅ Stats obtenidos: ${gameName}`);
    
    return response.data;
  } catch (err) {
    console.error(`[RANKING] Error fetching stats para ${gameName}:`, err.message);
    return [];
  }
}

// ==========================================
// Calcular winrate
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
  const solo = statsArray.find(q => q.queueType === config.TRACKED_QUEUES.SOLO);
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
// Construir ranking AMBAS queues (CON ORDENAMIENTO JERÁRQUICO)
// ==========================================
async function buildRankingBothQueues(users) {
  const soloRanking = [];
  const flexRanking = [];

  console.log(`[RANKING] Obteniendo stats de ${users.length} usuarios...`);

  for (const user of users) {
    try {
      const stats = await fetchAllQueueStats(user.puuid, `${user.game_name}#${user.tag_line}`, user.region);
      const { soloData, flexData } = extractAndFormatQueues(stats, user.game_name);

      soloRanking.push(soloData);
      flexRanking.push(flexData);
    } catch (err) {
      console.error(`[RANKING] Error procesando ${user.game_name}#${user.tag_line}:`, err);
    }
  }

  // Ordenar con función jerárquica: Tier > Rank > LP > Winrate
  soloRanking.sort(compareRanking);
  flexRanking.sort(compareRanking);

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
    'PLATINUM': '💠',
    'EMERALD': '🟢',
    'DIAMOND': '💎',
    'MASTER': '👑',
    'GRANDMASTER': '🌟',
    'CHALLENGER': '⭐',
    'UNRANKED': '❓'
  };
  return tiers[tier] || '❓';
}

// ==========================================
// Formatear DOS embeds (LÍNEA ÚNICA CON W-L Y EMOJIS)
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
      soloDescription += `**${index + 1}.** ${emoji} ${entry.name} - ${emoji} ${entry.tier} ${entry.rank} - **${entry.lp} LP** - ${winrateText}\n`;
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
      flexDescription += `**${index + 1}.** ${emoji} ${entry.name} - ${emoji} ${entry.tier} ${entry.rank} - **${entry.lp} LP** - ${winrateText}\n`;
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

// ==========================================
// Comparar rankings y retornar con cambios
// ==========================================
function compareRankings(currentQueue, previousQueue, queueName) {
  if (!previousQueue) {
    // Sin comparación anterior
    return currentQueue.map(entry => ({
      ...entry,
      lpDiff: 0,
      winsGained: 0,
      lossesGained: 0,
      partiesPlayed: 0,
      positionDiff: 0,
      tierChanged: false,
      noComparison: true
    }));
  }

  return currentQueue.map(current => {
    const previous = previousQueue.find(p => 
      p.name.toLowerCase() === current.name.toLowerCase()
    );

    if (!previous) {
      // Usuario nuevo
      return {
        ...current,
        lpDiff: 0,
        winsGained: current.wins,
        lossesGained: current.losses,
        partiesPlayed: current.wins + current.losses,
        positionDiff: 0,
        tierChanged: false,
        isNew: true
      };
    }

    // Calcular cambios
    const lpDiff = current.lp - previous.lp;
    const winsGained = current.wins - previous.wins;
    const lossesGained = current.losses - previous.losses;
    const partiesPlayed = winsGained + lossesGained;
    const positionDiff = current.position - previous.position;
    const tierChanged = current.tier !== previous.tier || current.rank !== previous.rank;

    return {
      ...current,
      lpDiff,
      winsGained,
      lossesGained,
      partiesPlayed,
      positionDiff,
      tierChanged,
      previousTier: previous.tier,
      previousRank: previous.rank,
      previousLp: previous.lp,
      previousPosition: previous.position,
      previousWins: previous.wins,
      previousLosses: previous.losses
    };
  });
}

// ==========================================
// Formatear embed de diferencias (como ranking normal)
// ==========================================
function formatDifferenceEmbed(comparisonData, queueName, currentDate, previousDate) {
  let description = '';

  if (comparisonData.length > 0 && comparisonData[0].noComparison) {
    description = '⚠️ Sin datos anteriores para comparar.\n\nGuarda otro snapshot para ver cambios.';
  } else {
    comparisonData.forEach((entry, index) => {
      const emoji = getTierEmoji(entry.tier);
      const winrateText = entry.winrate.text;
      
      // Línea principal: posición, tier, lp, winrate
      let mainLine = `**${index + 1}.** ${emoji} ${entry.name} - ${entry.tier} ${entry.rank} - **${entry.lp} LP** - ${winrateText}\n`;

      let changeDetails = '';

      if (entry.noComparison) {
        changeDetails = '  ⚠️ Sin comparación anterior\n';
      } else if (entry.isNew) {
        changeDetails = `  🆕 Nuevo en el ranking - 🎮 ${entry.partiesPlayed} partidas (${entry.winsGained}W-${entry.lossesGained}L)\n`;
      } else {
        // Detectar cambios de tier
        if (entry.tierChanged) {
          const tierEmoji = getTierEmoji(entry.previousTier);
          changeDetails += `  📊 Tier: ${tierEmoji} ${entry.previousTier} ${entry.previousRank} → ${emoji} ${entry.tier} ${entry.rank}\n`;
        }

        // LP diff
        if (entry.lpDiff > 0) {
          changeDetails += `  📈 LP: +${entry.lpDiff} (${entry.previousLp} → ${entry.lp})\n`;
        } else if (entry.lpDiff < 0) {
          changeDetails += `  📉 LP: ${entry.lpDiff} (${entry.previousLp} → ${entry.lp})\n`;
        } else {
          changeDetails += `  ➡️ LP: Sin cambios (${entry.lp} LP)\n`;
        }

        // Posición
        if (entry.positionDiff !== 0) {
          if (entry.positionDiff < 0) {
            changeDetails += `  🚀 Subió: #${entry.previousPosition} → #${entry.position}\n`;
          } else {
            changeDetails += `  📉 Bajó: #${entry.previousPosition} → #${entry.position}\n`;
          }
        }

        // Partidas
        if (entry.partiesPlayed > 0) {
          changeDetails += `  🎮 Partidas: ${entry.partiesPlayed} (${entry.winsGained}W-${entry.lossesGained}L)\n`;
        }
      }

      description += mainLine + changeDetails;
    });
  }

  const embed = {
    color: 0xffa500,
    title: `📊 ${queueName} - CAMBIOS`,
    description: description || 'Sin datos',
    footer: {
      text: `${previousDate ? previousDate + ' → ' : ''}${currentDate}`,
    },
  };

  return embed;
}

module.exports = {
  fetchPuuid,
  fetchAllQueueStats,
  calculateWinrate,
  extractAndFormatQueues,
  buildRankingBothQueues,
  formatRankingEmbeds,
  compareRankings,
  formatDifferenceEmbed,
};