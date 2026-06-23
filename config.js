require('dotenv').config();

module.exports = {
  // ===============================
  // TOKENS
  // ===============================
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  RIOT_API_KEY: process.env.RIOT_API_KEY,

  // ===============================
  // DISCORD
  // ===============================
  CHANNEL_ID: '889261192546246716', // Tu #ranking-lol
  GUILD_ID: '653356615944241158',   // Tu servidor

  // ===============================
  // RIOT API
  // ===============================
  RIOT_ACCOUNT_API: 'https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id',

  // Mapeo de región a plataforma para League API
  REGION_TO_PLATFORM: {
    'NA': 'na1',
    'BR': 'br1',
    'LAS': 'la2',
    'LAN': 'la2',
    'EUW': 'euw1',
    'EUNE': 'eun1',
    'KR': 'kr'
  },

  // ===============================
  // QUEUES A TRACKEAR
  // ===============================
  TRACKED_QUEUES: {
    SOLO: 'RANKED_SOLO_5x5',
    FLEX: 'RANKED_FLEX_SR'
  },

  // ===============================
  // REGIONES VÁLIDAS
  // ===============================
  VALID_REGIONS: ['NA', 'BR', 'LAS', 'LAN', 'EUW', 'EUNE', 'KR'],

  // ===============================
  // SCHEDULER (Martes 22:45 ART = 01:45 UTC miércoles)
  // Formato: 'minuto hora * * día'
  // ===============================
  // Para TESTING: cada 5 minutos
  //CRON_SCHEDULE: '*/2 * * * *',
  CRON_SCHEDULE: '00 19 * * 1',  // Martes 22:45 ART
  CRON_SNAPSHOT: '00 13 * * *',  // 23:55 ART cada día

  // ===============================
  // LIMITES
  // ===============================
  MAX_USERS: 40,
  TIMEOUT_API: 10000,  // 10 segundos en lugar de 5000
  RETRY_ATTEMPTS: 2,
};