const fs = require('fs').promises;
const path = require('path');

const DATA_PATH = path.join(__dirname, 'data', 'users.json');

// ==========================================
// Asegurar que el directorio existe
// ==========================================
async function ensureDataDir() {
  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  } catch (err) {
    console.error('[STORAGE] Error creando directorio:', err);
  }
}

// ==========================================
// Cargar datos completos (users + history)
// ==========================================
async function loadAllData() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DATA_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    return {
      users: parsed.users || [],
      rankings_history: parsed.rankings_history || {}
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('[STORAGE] Creando users.json vacío');
      await saveAllData([], {});
      return { users: [], rankings_history: {} };
    }
    console.error('[STORAGE] Error cargando datos:', err);
    return { users: [], rankings_history: {} };
  }
}

// ==========================================
// Guardar datos completos
// ==========================================
async function saveAllData(users, rankingsHistory) {
  try {
    await ensureDataDir();
    const data = { users, rankings_history: rankingsHistory };
    await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('[STORAGE] Error guardando datos:', err);
    return false;
  }
}

// ==========================================
// Cargar usuarios
// ==========================================
async function loadUsers() {
  const { users } = await loadAllData();
  return users;
}

// ==========================================
// Guardar usuarios
// ==========================================
async function saveUsers(users) {
  const { rankings_history } = await loadAllData();
  return await saveAllData(users, rankings_history);
}

// ==========================================
// Agregar usuario
// ==========================================
async function addUser(gameName, tagLine, region, puuid) {
  try {
    const { users, rankings_history } = await loadAllData();

    if (users.some(u =>
      u.game_name.toLowerCase() === gameName.toLowerCase() &&
      u.tag_line.toLowerCase() === tagLine.toLowerCase()
    )) {
      return { success: false, message: '❌ Ya está en la lista' };
    }

    if (users.length >= 40) {
      return { success: false, message: '❌ Límite de 40 usuarios alcanzado' };
    }

    users.push({
      game_name: gameName,
      tag_line: tagLine,
      region: region.toUpperCase(),
      puuid: puuid,
      added_date: new Date().toISOString().split('T')[0],
    });

    await saveAllData(users, rankings_history);
    console.log(`[STORAGE] ✅ Agregado: ${gameName}#${tagLine} (${region})`);
    return { success: true, message: `✅ ${gameName}#${tagLine} (${region}) agregado al ranking` };
  } catch (err) {
    console.error('[STORAGE] Error agregando usuario:', err);
    return { success: false, message: '❌ Error interno' };
  }
}

// ==========================================
// Remover usuario
// ==========================================
async function removeUser(gameName, tagLine) {
  try {
    const { users, rankings_history } = await loadAllData();
    const initialLength = users.length;

    const filtered = users.filter(
      u => !(u.game_name.toLowerCase() === gameName.toLowerCase() &&
        u.tag_line.toLowerCase() === tagLine.toLowerCase())
    );

    if (filtered.length === initialLength) {
      return { success: false, message: '❌ No encontrado' };
    }

    await saveAllData(filtered, rankings_history);
    console.log(`[STORAGE] ✅ Removido: ${gameName}#${tagLine}`);
    return { success: true, message: `✅ ${gameName}#${tagLine} removido del ranking` };
  } catch (err) {
    console.error('[STORAGE] Error removiendo usuario:', err);
    return { success: false, message: '❌ Error interno' };
  }
}

// ==========================================
// Listar usuarios
// ==========================================
async function listUsers() {
  const { users } = await loadAllData();
  return users;
}

// ==========================================
// Guardar ranking histórico
// ==========================================
async function saveRankingHistory(soloRanking, flexRanking) {
  try {
    const { users, rankings_history } = await loadAllData();

    // Fecha actual
    const today = new Date().toISOString().split('T')[0];

    // Agregar posiciones al ranking
    const soloWithPosition = soloRanking.map((entry, index) => ({
      ...entry,
      position: index + 1
    }));

    const flexWithPosition = flexRanking.map((entry, index) => ({
      ...entry,
      position: index + 1
    }));

    // Guardar histórico de hoy
    rankings_history[today] = {
      solo: soloWithPosition,
      flex: flexWithPosition
    };

    // Limpiar histórico > 4 snapshots
    const allDates = Object.keys(rankings_history).sort().reverse();
    if (allDates.length > 4) {
      // Mantener solo últimos 4 snapshots
      allDates.slice(4).forEach(date => {
        delete rankings_history[date];
      });
    }

    await saveAllData(users, rankings_history);
    console.log(`[STORAGE] ✅ Histórico guardado: ${today}`);
    return true;
  } catch (err) {
    console.error('[STORAGE] Error guardando histórico:', err);
    return false;
  }
}

// ==========================================
// Obtener histórico de ranking
// ==========================================
// ==========================================
// Obtener histórico de ranking (CON LOGGING)
// ==========================================
async function getRankingHistory() {
  try {
    const { rankings_history } = await loadAllData();
    const dates = Object.keys(rankings_history).sort().reverse();
    
    console.log(`[STORAGE] DEBUG - Fechas en histórico:`, dates);
    console.log(`[STORAGE] DEBUG - Total snapshots: ${dates.length}`);
    console.log(`[STORAGE] DEBUG - Fecha actual (para comparar): ${dates[0]}`);
    console.log(`[STORAGE] DEBUG - Fecha anterior (para comparar): ${dates[1]}`);
    
    return {
      current: rankings_history[dates[0]] || null,
      previous: rankings_history[dates[1]] || null,
      currentDate: dates[0],
      previousDate: dates[1],
      allDates: dates
    };
  } catch (err) {
    console.error('[STORAGE] Error obteniendo histórico:', err);
    return {
      current: null,
      previous: null,
      currentDate: null,
      previousDate: null,
      allDates: []
    };
  }
}

module.exports = {
  loadUsers,
  saveUsers,
  addUser,
  removeUser,
  listUsers,
  saveRankingHistory,
  getRankingHistory,
  loadAllData,
  saveAllData,
};