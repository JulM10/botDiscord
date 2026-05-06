const cron = require('node-cron');
const storage = require('./storage');
const ranking = require('./ranking');
const config = require('./config');

let scheduledTask = null;

// ==========================================
// Publicar ranking semanal (DOS embeds)
// ==========================================
async function publishWeeklyRanking(client) {
  console.log('\n[SCHEDULER] ⏰ EJECUTANDO RANKING SEMANAL...');

  try {
    // 1. Cargar usuarios
    const users = await storage.loadUsers();

    if (users.length === 0) {
      console.log('[SCHEDULER] ⚠️  No hay usuarios en tracking');
      return;
    }

    console.log(`[SCHEDULER] 📊 Obteniendo stats de ${users.length} usuarios...`);

    // 2. Construir rankings
    const { soloRanking, flexRanking } = await ranking.buildRankingBothQueues(users);

    // 3. Formatear embeds
    const [embedSolo, embedFlex] = ranking.formatRankingEmbeds(soloRanking, flexRanking);

    // 4. Obtener canal y enviar
    const channel = client.channels.cache.get(config.CHANNEL_ID);

    if (!channel) {
      console.error('[SCHEDULER] ❌ Canal no encontrado');
      return;
    }

    // Enviar SOLO
    await channel.send({ embeds: [embedSolo] });
    console.log('[SCHEDULER] ✅ Embed SOLO publicado');

    // Esperar 500ms
    await new Promise(r => setTimeout(r, 500));

    // Enviar FLEX
    await channel.send({ embeds: [embedFlex] });
    console.log('[SCHEDULER] ✅ Embed FLEX publicado');

    // 5. GUARDAR HISTÓRICO
    await storage.saveRankingHistory(soloRanking, flexRanking);
    console.log(`[SCHEDULER] ✅ Histórico guardado - ${users.length} usuarios\n`);
  } catch (err) {
    console.error('[SCHEDULER] ❌ Error:', err);
  }
}

// ==========================================
// Inicializar scheduler
// ==========================================
function initScheduler(client) {
  console.log(`[SCHEDULER] DEBUG - CRON_SCHEDULE: ${config.CRON_SCHEDULE}`);
  
  scheduledTask = cron.schedule(config.CRON_SCHEDULE, () => {
    console.log('[SCHEDULER] ⏰ EJECUTANDO (por cron)...');
    publishWeeklyRanking(client);
  });

  console.log('[SCHEDULER] ✅ Scheduler iniciado');
  console.log('[SCHEDULER] ⏰ Próxima ejecución: Cada martes 22:45 ART (01:45 UTC)');
}

// ==========================================
// Detener scheduler
// ==========================================
function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    console.log('[SCHEDULER] ⛔ Scheduler detenido');
  }
}

module.exports = {
  initScheduler,
  stopScheduler,
  publishWeeklyRanking,
};