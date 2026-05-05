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
// Cargar usuarios desde JSON
// ==========================================
async function loadUsers() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(data).users || [];
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('[STORAGE] Creando users.json vacío');
      await saveUsers([]);
      return [];
    }
    console.error('[STORAGE] Error cargando users:', err);
    return [];
  }
}

// ==========================================
// Guardar usuarios al JSON
// ==========================================
async function saveUsers(users) {
  try {
    await ensureDataDir();
    const data = { users };
    await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('[STORAGE] Error guardando users:', err);
    return false;
  }
}

// ==========================================
// Agregar usuario
// ==========================================
async function addUser(gameName, tagLine, region, puuid) {
  try {
    const users = await loadUsers();

    // Validar no exista (case-insensitive)
    if (users.some(u => 
      u.game_name.toLowerCase() === gameName.toLowerCase() && 
      u.tag_line.toLowerCase() === tagLine.toLowerCase()
    )) {
      return { success: false, message: '❌ Ya está en la lista' };
    }

    // Validar límite
    if (users.length >= 40) {
      return { success: false, message: '❌ Límite de 40 usuarios alcanzado' };
    }

    // Agregar
    users.push({
      game_name: gameName,
      tag_line: tagLine,
      region: region.toUpperCase(),
      puuid: puuid,
      added_date: new Date().toISOString().split('T')[0],
    });

    await saveUsers(users);
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
    let users = await loadUsers();
    const initialLength = users.length;

    users = users.filter(
      u => !(u.game_name.toLowerCase() === gameName.toLowerCase() && 
             u.tag_line.toLowerCase() === tagLine.toLowerCase())
    );

    if (users.length === initialLength) {
      return { success: false, message: '❌ No encontrado' };
    }

    await saveUsers(users);
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
  try {
    return await loadUsers();
  } catch (err) {
    console.error('[STORAGE] Error listando usuarios:', err);
    return [];
  }
}

module.exports = {
  loadUsers,
  saveUsers,
  addUser,
  removeUser,
  listUsers,
};