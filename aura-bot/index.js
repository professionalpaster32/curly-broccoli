import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from 'dotenv';
import { registerSlashCommands } from './src/utils.js';
import { storage, getPrefixes, DEFAULT_PREFIXES } from './src/config.js';
import * as commands from './src/commands.js';
import * as apiCommands from './src/api.js';

config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

const processedMessages = new Set();

const MESSAGE_CACHE_DURATION = 5000;

const allCommands = { ...commands, ...apiCommands };

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Serving ${client.guilds.cache.size} guilds`);
  console.log(`Default prefixes: ${DEFAULT_PREFIXES.join(', ')}`);
  
  await registerSlashCommands(client.user.id, process.env.DISCORD_TOKEN);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (processedMessages.has(message.id)) {
    return;
  }

  processedMessages.add(message.id);
  setTimeout(() => processedMessages.delete(message.id), MESSAGE_CACHE_DURATION);

  const prefixes = getPrefixes(message.guild.id);
  
  let usedPrefix = null;
  for (const prefix of prefixes) {
    if (message.content.startsWith(prefix)) {
      usedPrefix = prefix;
      break;
    }
  }

  if (!usedPrefix) return;

  const guildAfk = storage.afk.get(message.guild.id);
  if (guildAfk) {
    const userAfk = guildAfk.get(message.author.id);
    if (userAfk) {
      if (!userAfk.ignoredChannels.includes(message.channel.id)) {
        guildAfk.delete(message.author.id);
        message.reply(`Welcome back! Your AFK status has been removed.`).then(m => {
          setTimeout(() => m.delete().catch(() => {}), 5000);
        });
      }
    }

    message.mentions.users.forEach(async (mentionedUser) => {
      const mentionedAfk = guildAfk.get(mentionedUser.id);
      if (mentionedAfk && !mentionedAfk.ignoredChannels.includes(message.channel.id)) {
        const afkDuration = Date.now() - mentionedAfk.timestamp;
        const hours = Math.floor(afkDuration / 3600000);
        const minutes = Math.floor((afkDuration % 3600000) / 60000);
        
        let timeStr = '';
        if (hours > 0) timeStr += `${hours}h `;
        if (minutes > 0) timeStr += `${minutes}m`;
        if (!timeStr) timeStr = 'just now';

        message.reply(`${mentionedUser.tag} is currently AFK: ${mentionedAfk.status} (${timeStr.trim()})`).then(m => {
          setTimeout(() => m.delete().catch(() => {}), 10000);
        });
      }
    });
  }

  const guildHighlights = storage.highlights.get(message.guild.id);
  if (guildHighlights) {
    const messageContent = message.content.toLowerCase();
    for (const [userId, phrases] of guildHighlights) {
      if (userId === message.author.id) continue;
      
      for (const phrase of phrases) {
        if (messageContent.includes(phrase)) {
          const user = await client.users.fetch(userId).catch(() => null);
          if (user) {
            try {
              await user.send({
                content: `**Highlight in ${message.guild.name} #${message.channel.name}**\n\`\`\`${message.content.slice(0, 1900)}\`\`\`\n[Jump to message](${message.url})`
              });
            } catch (error) {
              console.log(`Could not send highlight to ${user.tag}`);
            }
          }
          break;
        }
      }
    }
  }

  const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) return;

  const command = allCommands[commandName] || allCommands[commandName.replace(/^check/, '')];
  if (!command) return;

  try {
    const interaction = {
      member: message.member,
      guild: message.guild,
      channel: message.channel,
      user: message.author,
      client: message.client,
      reply: async (options) => {
        if (typeof options === 'string') {
          return message.reply(options);
        }
        
        const replyOptions = {};
        if (options.embeds) replyOptions.embeds = options.embeds;
        if (options.content) replyOptions.content = options.content;
        if (options.components) replyOptions.components = options.components;
        if (options.files) replyOptions.files = options.files;
        if (options.fetchReply) replyOptions.fetchReply = options.fetchReply;
        
        return message.reply(replyOptions);
      },
      options: null
    };

    await command(interaction, args);
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    message.reply('There was an error executing that command.').catch(() => {});
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;
  const command = allCommands[commandName] || allCommands[commandName.replace(/^check/, '')];

  if (!command) {
    return interaction.reply({ content: 'Unknown command.', ephemeral: true });
  }

  try {
    await command(interaction, []);
  } catch (error) {
    console.error(`Error executing slash command ${commandName}:`, error);
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error executing that command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith('cancel_warn_')) {
    const warnId = interaction.customId.replace('cancel_warn_', '');
    
    const guildWarnings = storage.warnings.get(interaction.guild.id);
    if (guildWarnings) {
      for (const [userId, warnings] of guildWarnings) {
        const index = warnings.findIndex(w => w.id === warnId);
        if (index > -1) {
          warnings.splice(index, 1);
          await interaction.update({ 
            content: '⚠️ Warning cancelled by moderator.',
            embeds: [],
            components: []
          });
          return;
        }
      }
    }

    await interaction.update({ 
      content: 'Warning not found or already processed.',
      embeds: [],
      components: []
    });
  }
});

client.on('guildMemberAdd', async (member) => {
  const guildPersist = storage.rolePersist.get(member.guild.id);
  if (!guildPersist) return;

  const userRoles = guildPersist.get(member.id);
  if (!userRoles || userRoles.size === 0) return;

  for (const roleId of userRoles) {
    const role = member.guild.roles.cache.get(roleId);
    if (role) {
      await member.roles.add(role).catch(() => {});
    }
  }
});

client.on('guildMemberRemove', async (member) => {
  if (!storage.rolePersist.has(member.guild.id)) return;

  const guildPersist = storage.rolePersist.get(member.guild.id);
  const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.id);
  
  if (roles.length > 0) {
    guildPersist.set(member.id, new Set(roles));
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  if (reaction.emoji.name === '🎉') {
    const giveaway = storage.giveaways.get(reaction.message.id);
    if (giveaway) {
      console.log(`${user.tag} entered giveaway: ${giveaway.prize}`);
    }
  }

  const poll = storage.polls.get(reaction.message.id);
  if (poll) {
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const index = emojis.indexOf(reaction.emoji.name);
    
    if (index !== -1 && index < poll.options.length) {
      poll.votes[index] = (poll.votes[index] || 0) + 1;
      poll.totalVotes = (poll.totalVotes || 0) + 1;
    }
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;

  const poll = storage.polls.get(reaction.message.id);
  if (poll) {
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const index = emojis.indexOf(reaction.emoji.name);
    
    if (index !== -1 && index < poll.options.length && poll.votes[index] > 0) {
      poll.votes[index] = poll.votes[index] - 1;
      poll.totalVotes = Math.max(0, (poll.totalVotes || 0) - 1);
    }
  }
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

client.login(process.env.DISCORD_TOKEN);
