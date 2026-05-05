const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const config = require('./config');
const { commands, handlers } = require('./commands');
const scheduler = require('./scheduler');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  🤖 LOL Ranking Bot - Iniciando...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ==========================================
// Crear cliente Discord
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

// ==========================================
// Evento: Bot listo
// ==========================================
client.once('ready', async () => {
  console.log(`[BOT] ✅ Conectado como ${client.user.tag}\n`);

  // Registrar slash commands
  const guild = client.guilds.cache.get(config.GUILD_ID);

  if (!guild) {
    console.error('[BOT] ❌ Servidor (GUILD_ID) no encontrado');
    console.error('[BOT] ⚠️  Verifica que GUILD_ID en config.js sea correcto');
    return;
  }

  try {
    await guild.commands.set(commands);
    console.log('[BOT] ✅ Slash commands registrados\n');
  } catch (err) {
    console.error('[BOT] ❌ Error registrando comandos:', err);
  }

  // Iniciar scheduler
  scheduler.initScheduler(client);

  console.log('[BOT] ✅ Bot completamente listo\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

// ==========================================
// Evento: Interacción (slash command)
// ==========================================
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;
  const handler = handlers[commandName];

  if (!handler) {
    console.error(`[BOT] ❌ No hay handler para comando: ${commandName}`);
    return;
  }

  try {
    console.log(`[BOT] 📨 Ejecutando comando: /${commandName}`);
    await handler(interaction);
  } catch (err) {
    console.error(`[BOT] ❌ Error ejecutando /${commandName}:`, err);
    try {
      await interaction.reply({
        content: '❌ Error interno al ejecutar comando',
        ephemeral: true,
      });
    } catch (replyErr) {
      console.error('[BOT] ❌ Error enviando respuesta:', replyErr);
    }
  }
});

// ==========================================
// Evento: Error del cliente
// ==========================================
client.on('error', err => {
  console.error('[BOT] ❌ CLIENT ERROR:', err);
});

// ==========================================
// Evento: Rejection no manejada
// ==========================================
process.on('unhandledRejection', err => {
  console.error('[BOT] ❌ UNHANDLED REJECTION:', err);
});

// ==========================================
// Conectar bot
// ==========================================
client.login(config.DISCORD_TOKEN);