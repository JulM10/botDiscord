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
  CHANNEL_ID: '1501013275872198726', // Tu #ranking-lol
  GUILD_ID: '622144363018977289',   // Tu servidor

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
  // SCHEDULER (Lunes 5 PM ART = 20:00 UTC)
  // ===============================
  CRON_SCHEDULE: '0 20 * * 1',

  // ===============================
  // LIMITES
  // ===============================
  MAX_USERS: 40,
  TIMEOUT_API: 5000,
  RETRY_ATTEMPTS: 2,
};