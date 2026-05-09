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
// ==========================================
// Manejar interacciones (slash commands)
// ==========================================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  console.log(`[BOT] 📨 Ejecutando comando: /${interaction.commandName}`);

  try {
    const handler = commandHandlers[interaction.commandName];

    if (!handler) {
      console.warn(`[BOT] ⚠️ Comando no encontrado: ${interaction.commandName}`);
      return;
    }

    // Ejecutar handler
    await handler(interaction);
  } catch (err) {
    console.error(`[BOT] ❌ Error ejecutando /${interaction.commandName}:`, err);
    
    try {
      // Intentar responder si aún no se respondió
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Error procesando el comando. Intenta de nuevo.',
          flags: 64,  // ephemeral
        });
      } else {
        await interaction.editReply({
          content: '❌ Error procesando el comando. Intenta de nuevo.',
        });
      }
    } catch (replyErr) {
      console.error(`[BOT] ❌ Error enviando respuesta de error:`, replyErr.message);
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