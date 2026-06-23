const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const { commands, handlers: commandHandlers } = require('./commands');
const { initScheduler, stopScheduler } = require('./scheduler');
const config = require('./config');

// ==========================================
// Crear cliente
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ==========================================
// Bot listo
// ==========================================
client.on('ready', () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🤖 LOL Ranking Bot - Iniciando...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`[BOT] ✅ Conectado como ${client.user.tag}`);

  // Iniciar scheduler
  initScheduler(client);

  console.log('[BOT] ✅ Bot completamente listo');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

// ==========================================
// Registrar slash commands
// ==========================================
async function registerCommands() {
  try {
    const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

    console.log('[BOT] 📝 Registrando slash commands...');

    const commandData = commands.map(cmd => cmd.toJSON());

    await rest.put(Routes.applicationGuildCommands(client.user.id, config.GUILD_ID), {
      body: commandData,
    });

    console.log('[BOT] ✅ Slash commands registrados');
  } catch (err) {
    console.error('[BOT] ❌ Error registrando commands:', err);
  }
}

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
// Login y registrar commands
// ==========================================
client.login(config.DISCORD_TOKEN);

client.once('ready', () => {
  registerCommands();
});

// ==========================================
// Manejo de errores no capturados
// ==========================================
process.on('unhandledRejection', (err) => {
  console.error('[BOT] ❌ Promise rechazada sin capturar:', err);
});

process.on('uncaughtException', (err) => {
  console.error('[BOT] ❌ Error no capturado:', err);
});