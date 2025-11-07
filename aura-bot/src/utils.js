import axios from 'axios';
import ms from 'ms';
import { REST, Routes, ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import { PermissionFlagsBits } from 'discord.js';
import { storage } from './config.js';

export const fetchCatImage = async () => {
  try {
    const response = await axios.get('https://api.thecatapi.com/v1/images/search');
    return response.data[0]?.url;
  } catch (error) {
    return null;
  }
};

export const fetchDogImage = async () => {
  try {
    const response = await axios.get('https://dog.ceo/api/breeds/image/random');
    return response.data?.message;
  } catch (error) {
    return null;
  }
};

export const fetchPugImage = async () => {
  try {
    const response = await axios.get('https://dog.ceo/api/breed/pug/images/random');
    return response.data?.message;
  } catch (error) {
    return null;
  }
};

export const fetchDadJoke = async () => {
  try {
    const response = await axios.get('https://icanhazdadjoke.com/', {
      headers: { Accept: 'application/json' }
    });
    return response.data?.joke;
  } catch (error) {
    return null;
  }
};

export const fetchChuckNorris = async () => {
  try {
    const response = await axios.get('https://api.chucknorris.io/jokes/random');
    return response.data?.value;
  } catch (error) {
    return null;
  }
};

export const fetchPokemon = async (name) => {
  try {
    const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`);
    return response.data;
  } catch (error) {
    return null;
  }
};

export const fetchGithubRepo = async (repo) => {
  try {
    const response = await axios.get(`https://api.github.com/repos/${repo}`);
    return response.data;
  } catch (error) {
    return null;
  }
};

export const fetchSpaceStation = async () => {
  try {
    const response = await axios.get('http://api.open-notify.org/astros.json');
    return response.data;
  } catch (error) {
    return null;
  }
};

export const fetchItunesSong = async (query) => {
  try {
    const response = await axios.get('https://itunes.apple.com/search', {
      params: { term: query, media: 'music', limit: 1 }
    });
    return response.data?.results?.[0];
  } catch (error) {
    return null;
  }
};

export const fetchCovidStats = async (location = null) => {
  try {
    if (!location) {
      const response = await axios.get('https://disease.sh/v3/covid-19/all');
      return { type: 'global', data: response.data };
    }
    
    try {
      const response = await axios.get(`https://disease.sh/v3/covid-19/countries/${location}`);
      return { type: 'country', data: response.data };
    } catch {
      const response = await axios.get(`https://disease.sh/v3/covid-19/states/${location}`);
      return { type: 'state', data: response.data };
    }
  } catch (error) {
    return null;
  }
};

export const createModLog = (guildId, action, user, moderator, reason, duration = null) => {
  const caseNum = (storage.caseCounter.get(guildId) || 0) + 1;
  storage.caseCounter.set(guildId, caseNum);
  
  const logEntry = {
    caseId: caseNum,
    action,
    userId: user.id,
    userTag: user.tag,
    moderatorId: moderator.id,
    moderatorTag: moderator.tag,
    reason: reason || 'No reason provided',
    timestamp: Date.now(),
    duration
  };
  
  if (!storage.modlogs.has(guildId)) {
    storage.modlogs.set(guildId, new Map());
  }
  
  const guildLogs = storage.modlogs.get(guildId);
  if (!guildLogs.has(user.id)) {
    guildLogs.set(user.id, []);
  }
  
  guildLogs.get(user.id).push(logEntry);
  
  return caseNum;
};

export const getModLogs = (guildId, userId) => {
  const guildLogs = storage.modlogs.get(guildId);
  if (!guildLogs) return [];
  return guildLogs.get(userId) || [];
};

export const getCase = (guildId, caseId) => {
  const guildLogs = storage.modlogs.get(guildId);
  if (!guildLogs) return null;
  
  for (const [userId, logs] of guildLogs) {
    const found = logs.find(log => log.caseId === caseId);
    if (found) return found;
  }
  return null;
};

export const updateCaseReason = (guildId, caseId, newReason) => {
  const guildLogs = storage.modlogs.get(guildId);
  if (!guildLogs) return false;
  
  for (const [userId, logs] of guildLogs) {
    const log = logs.find(l => l.caseId === caseId);
    if (log) {
      log.reason = newReason;
      return true;
    }
  }
  return false;
};

export const isModerator = (member) => {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  if (member.permissions.has(PermissionFlagsBits.BanMembers)) return true;
  if (member.permissions.has(PermissionFlagsBits.KickMembers)) return true;
  
  const modRoles = storage.moderatorRoles.get(member.guild.id) || [];
  return member.roles.cache.some(role => modRoles.includes(role.id));
};

export const isManager = (member) => {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  return false;
};

export const canModerate = (moderator, target) => {
  if (moderator.guild.ownerId === moderator.id) return true;
  if (target.guild.ownerId === target.id) return false;
  if (moderator.roles.highest.position <= target.roles.highest.position) return false;
  return true;
};

export const isCommandDisabled = (guildId, commandName) => {
  const disabled = storage.disabledCommands.get(guildId) || new Set();
  return disabled.has(commandName);
};

export const isModuleDisabled = (guildId, moduleName) => {
  const disabled = storage.disabledModules.get(guildId) || new Set();
  return disabled.has(moduleName);
};

export const isChannelIgnored = (guildId, channelId) => {
  const ignored = storage.ignoredChannels.get(guildId) || new Set();
  return ignored.has(channelId);
};

export const isUserIgnored = (guildId, userId) => {
  const ignored = storage.ignoredUsers.get(guildId) || new Set();
  return ignored.has(userId);
};

export const isRoleIgnored = (guildId, member) => {
  const ignored = storage.ignoredRoles.get(guildId) || new Set();
  return member.roles.cache.some(role => ignored.has(role.id));
};

export const parseTime = (timeString) => {
  if (!timeString) return null;
  
  const time = ms(timeString);
  if (!time || isNaN(time)) return null;
  
  return time;
};

export const formatUptime = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours % 24 > 0) parts.push(`${hours % 24}h`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
  if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);

  return parts.join(' ') || '0s';
};

export const formatDuration = (ms) => {
  return formatUptime(ms);
};

export const createEmbed = (type, title, description) => {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setTimestamp();

  if (description) {
    embed.setDescription(description);
  }

  switch (type) {
    case 'success':
      embed.setColor(0x00FF00);
      break;
    case 'error':
      embed.setColor(0xFF0000);
      break;
    case 'warning':
      embed.setColor(0xFFA500);
      break;
    case 'info':
      embed.setColor(0x3498db);
      break;
    case 'moderation':
      embed.setColor(0xe74c3c);
      break;
    default:
      embed.setColor(0x3498db);
  }

  return embed;
};

export const createErrorEmbed = (message) => {
  return createEmbed('error', '❌ Error', message);
};

export const createSuccessEmbed = (message) => {
  return createEmbed('success', '✅ Success', message);
};

export const createWarningEmbed = (message) => {
  return createEmbed('warning', '⚠️ Warning', message);
};

export const createModerationEmbed = (action, user, moderator, reason) => {
  const embed = createEmbed('moderation', `${action}`, null);
  embed.addFields(
    { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
    { name: 'Moderator', value: moderator.tag, inline: true },
    { name: 'Reason', value: reason || 'No reason provided', inline: false }
  );
  embed.setThumbnail(user.displayAvatarURL({ dynamic: true }));
  return embed;
};

export const slashCommands = [
  { name: 'ban', description: 'Ban a member with optional time limit', options: [
    { name: 'user', description: 'User to ban', type: ApplicationCommandOptionType.User, required: true },
    { name: 'duration', description: 'Ban duration (e.g., 1d, 1h)', type: ApplicationCommandOptionType.String, required: false },
    { name: 'reason', description: 'Reason for ban', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'unban', description: 'Unban a member', options: [
    { name: 'user', description: 'User ID to unban', type: ApplicationCommandOptionType.String, required: true },
    { name: 'reason', description: 'Reason for unban', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'kick', description: 'Kick a member', options: [
    { name: 'user', description: 'User to kick', type: ApplicationCommandOptionType.User, required: true },
    { name: 'reason', description: 'Reason for kick', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'mute', description: 'Mute a member', options: [
    { name: 'user', description: 'User to mute', type: ApplicationCommandOptionType.User, required: true },
    { name: 'duration', description: 'Mute duration (e.g., 1h, 30m)', type: ApplicationCommandOptionType.String, required: false },
    { name: 'reason', description: 'Reason for mute', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'unmute', description: 'Unmute a member', options: [
    { name: 'user', description: 'User to unmute', type: ApplicationCommandOptionType.User, required: true },
    { name: 'reason', description: 'Reason for unmute', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'warn', description: 'Warn a member', options: [
    { name: 'user', description: 'User to warn', type: ApplicationCommandOptionType.User, required: true },
    { name: 'reason', description: 'Reason for warning', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'softban', description: 'Softban a member', options: [
    { name: 'user', description: 'User to softban', type: ApplicationCommandOptionType.User, required: true },
    { name: 'reason', description: 'Reason for softban', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'lock', description: 'Lock a channel', options: [
    { name: 'channel', description: 'Channel to lock', type: ApplicationCommandOptionType.Channel, required: false },
    { name: 'duration', description: 'Lock duration', type: ApplicationCommandOptionType.String, required: false },
    { name: 'message', description: 'Lock message', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'unlock', description: 'Unlock a channel', options: [
    { name: 'channel', description: 'Channel to unlock', type: ApplicationCommandOptionType.Channel, required: false },
    { name: 'message', description: 'Unlock message', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'clean', description: 'Clean bot messages', options: [
    { name: 'amount', description: 'Number of messages to check', type: ApplicationCommandOptionType.Integer, required: false }
  ]},
  { name: 'deafen', description: 'Deafen a member', options: [
    { name: 'user', description: 'User to deafen', type: ApplicationCommandOptionType.User, required: true },
    { name: 'reason', description: 'Reason', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'undeafen', description: 'Undeafen a member', options: [
    { name: 'user', description: 'User to undeafen', type: ApplicationCommandOptionType.User, required: true },
    { name: 'reason', description: 'Reason', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'warnings', description: 'View warnings for a user', options: [
    { name: 'user', description: 'User to check', type: ApplicationCommandOptionType.User, required: true }
  ]},
  { name: 'checkwarnings', description: 'View warnings for a user', options: [
    { name: 'user', description: 'User to check', type: ApplicationCommandOptionType.User, required: true }
  ]},
  { name: 'clearwarn', description: 'Clear all warnings for a user', options: [
    { name: 'user', description: 'User to clear warnings', type: ApplicationCommandOptionType.User, required: true }
  ]},
  { name: 'delwarn', description: 'Delete a specific warning', options: [
    { name: 'user', description: 'User', type: ApplicationCommandOptionType.User, required: true },
    { name: 'index', description: 'Warning number', type: ApplicationCommandOptionType.Integer, required: true }
  ]},
  { name: 'cat', description: 'Get a random cat picture' },
  { name: 'dog', description: 'Get a random dog picture' },
  { name: 'pug', description: 'Get a random pug picture' },
  { name: 'dadjoke', description: 'Get a random dad joke' },
  { name: 'norris', description: 'Get a Chuck Norris fact' },
  { name: 'flip', description: 'Flip a coin' },
  { name: 'flipcoin', description: 'Flip a coin' },
  { name: 'rps', description: 'Play rock paper scissors', options: [
    { name: 'choice', description: 'Your choice', type: ApplicationCommandOptionType.String, required: true, choices: [
      { name: 'Rock', value: 'rock' },
      { name: 'Paper', value: 'paper' },
      { name: 'Scissors', value: 'scissors' }
    ]}
  ]},
  { name: 'poll', description: 'Create a poll', options: [
    { name: 'question', description: 'Poll question', type: ApplicationCommandOptionType.String, required: true },
    { name: 'options', description: 'Comma-separated options', type: ApplicationCommandOptionType.String, required: true }
  ]},
  { name: 'roll', description: 'Roll dice', options: [
    { name: 'dice', description: 'Dice type (d6, d20, etc)', type: ApplicationCommandOptionType.String, required: false },
    { name: 'count', description: 'Number of dice', type: ApplicationCommandOptionType.Integer, required: false }
  ]},
  { name: 'afk', description: 'Set AFK status', options: [
    { name: 'status', description: 'AFK status message', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'whois', description: 'Get user information', options: [
    { name: 'user', description: 'User to check', type: ApplicationCommandOptionType.User, required: false }
  ]},
  { name: 'serverinfo', description: 'Get server information' },
  { name: 'membercount', description: 'Get member count' },
  { name: 'avatar', description: 'Get user avatar', options: [
    { name: 'user', description: 'User', type: ApplicationCommandOptionType.User, required: false }
  ]},
  { name: 'emotes', description: 'List server emojis', options: [
    { name: 'search', description: 'Search query', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'remindme', description: 'Set a reminder', options: [
    { name: 'time', description: 'Time (e.g., 1h, 30m)', type: ApplicationCommandOptionType.String, required: true },
    { name: 'reminder', description: 'Reminder message', type: ApplicationCommandOptionType.String, required: true }
  ]},
  { name: 'randomcolor', description: 'Generate a random color' },
  { name: 'color', description: 'Preview a hex color', options: [
    { name: 'hex', description: 'Hex color code', type: ApplicationCommandOptionType.String, required: true }
  ]},
  { name: 'distance', description: 'Calculate distance between coordinates', options: [
    { name: 'coordinates1', description: 'First coordinates (lat,lon)', type: ApplicationCommandOptionType.String, required: true },
    { name: 'coordinates2', description: 'Second coordinates (lat,lon)', type: ApplicationCommandOptionType.String, required: true }
  ]},
  { name: 'pokemon', description: 'Get Pokémon information', options: [
    { name: 'name', description: 'Pokémon name', type: ApplicationCommandOptionType.String, required: true }
  ]},
  { name: 'covid', description: 'Get COVID-19 statistics', options: [
    { name: 'location', description: 'Country or state', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'uptime', description: 'Get bot uptime' },
  { name: 'info', description: 'Get bot information' },
  { name: 'prefix', description: 'View or change server prefix', options: [
    { name: 'new_prefix', description: 'New prefix', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'addrole', description: 'Create a new role', options: [
    { name: 'name', description: 'Role name', type: ApplicationCommandOptionType.String, required: true },
    { name: 'color', description: 'Hex color', type: ApplicationCommandOptionType.String, required: false },
    { name: 'hoist', description: 'Display separately', type: ApplicationCommandOptionType.Boolean, required: false }
  ]},
  { name: 'delrole', description: 'Delete a role', options: [
    { name: 'role', description: 'Role to delete', type: ApplicationCommandOptionType.Role, required: true }
  ]},
  { name: 'announce', description: 'Send an announcement', options: [
    { name: 'text', description: 'Announcement text', type: ApplicationCommandOptionType.String, required: true },
    { name: 'channel', description: 'Channel to send announcement', type: ApplicationCommandOptionType.Channel, required: true },
    { name: 'use_embed', description: 'Use embed format', type: ApplicationCommandOptionType.String, required: true, choices: [
      { name: 'Yes', value: 'yes' },
      { name: 'No', value: 'no' }
    ]},
    { name: 'url', description: 'Optional URL link', type: ApplicationCommandOptionType.String, required: false },
    { name: 'url_title', description: 'URL button text', type: ApplicationCommandOptionType.String, required: false },
    { name: 'image', description: 'Image URL', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'purge', description: 'Delete messages', options: [
    { name: 'amount', description: 'Number of messages', type: ApplicationCommandOptionType.Integer, required: true }
  ]},
  { name: 'setnick', description: 'Change user nickname', options: [
    { name: 'user', description: 'User', type: ApplicationCommandOptionType.User, required: true },
    { name: 'nickname', description: 'New nickname', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'rolename', description: 'Rename a role', options: [
    { name: 'role', description: 'Role', type: ApplicationCommandOptionType.Role, required: true },
    { name: 'new_name', description: 'New name', type: ApplicationCommandOptionType.String, required: true }
  ]},
  { name: 'rolecolor', description: 'Change role color', options: [
    { name: 'role', description: 'Role', type: ApplicationCommandOptionType.Role, required: true },
    { name: 'color', description: 'Hex color', type: ApplicationCommandOptionType.String, required: true }
  ]},
  { name: 'mentionable', description: 'Toggle role mentionable', options: [
    { name: 'role', description: 'Role', type: ApplicationCommandOptionType.Role, required: true },
    { name: 'mentionable', description: 'Mentionable', type: ApplicationCommandOptionType.Boolean, required: false }
  ]},
  { name: 'ignorechannel', description: 'Toggle channel ignore', options: [
    { name: 'channel', description: 'Channel', type: ApplicationCommandOptionType.Channel, required: true }
  ]},
  { name: 'ignoreuser', description: 'Toggle user ignore', options: [
    { name: 'user', description: 'User', type: ApplicationCommandOptionType.User, required: true }
  ]},
  { name: 'ignorerole', description: 'Toggle role ignore', options: [
    { name: 'role', description: 'Role', type: ApplicationCommandOptionType.Role, required: true }
  ]},
  { name: 'github', description: 'Get GitHub repository info', options: [
    { name: 'repository', description: 'owner/repo', type: ApplicationCommandOptionType.String, required: true }
  ]},
  { name: 'space', description: 'Get ISS information' },
  { name: 'itunes', description: 'Search for a song', options: [
    { name: 'song', description: 'Song name', type: ApplicationCommandOptionType.String, required: true }
  ]},
  { name: 'ranks', description: 'View joinable ranks' },
  { name: 'addrank', description: 'Add a joinable rank', options: [
    { name: 'role', description: 'Role name or ID', type: ApplicationCommandOptionType.String, required: true }
  ]},
  { name: 'delrank', description: 'Remove a joinable rank', options: [
    { name: 'role', description: 'Role name or ID', type: ApplicationCommandOptionType.String, required: true }
  ]},
  { name: 'rank', description: 'Join or leave a rank', options: [
    { name: 'rank', description: 'Rank name', type: ApplicationCommandOptionType.String, required: true }
  ]},
  { name: 'roles', description: 'List server roles', options: [
    { name: 'search', description: 'Search query', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'roleinfo', description: 'Get role information', options: [
    { name: 'role', description: 'Role', type: ApplicationCommandOptionType.Role, required: true }
  ]},
  { name: 'members', description: 'List members in a role', options: [
    { name: 'role', description: 'Role', type: ApplicationCommandOptionType.Role, required: true }
  ]},
  { name: 'modlogs', description: 'View moderation logs', options: [
    { name: 'user', description: 'User to check', type: ApplicationCommandOptionType.User, required: true }
  ]},
  { name: 'case', description: 'View a specific case', options: [
    { name: 'case_id', description: 'Case ID', type: ApplicationCommandOptionType.Integer, required: true }
  ]},
  { name: 'reason', description: 'Update case reason', options: [
    { name: 'case_id', description: 'Case ID', type: ApplicationCommandOptionType.Integer, required: true },
    { name: 'reason', description: 'New reason', type: ApplicationCommandOptionType.String, required: true }
  ]},
  { name: 'notes', description: 'View notes for a user', options: [
    { name: 'user', description: 'User', type: ApplicationCommandOptionType.User, required: true }
  ]},
  { name: 'note', description: 'Add a note for a user', options: [
    { name: 'user', description: 'User', type: ApplicationCommandOptionType.User, required: true },
    { name: 'text', description: 'Note text', type: ApplicationCommandOptionType.String, required: true }
  ]},
  { name: 'delnote', description: 'Delete a note', options: [
    { name: 'user', description: 'User', type: ApplicationCommandOptionType.User, required: true },
    { name: 'note_id', description: 'Note number', type: ApplicationCommandOptionType.Integer, required: true }
  ]},
  { name: 'clearnotes', description: 'Clear all notes for a user', options: [
    { name: 'user', description: 'User', type: ApplicationCommandOptionType.User, required: true }
  ]},
  { name: 'highlights', description: 'Manage highlights', options: [
    { name: 'action', description: 'Action', type: ApplicationCommandOptionType.String, required: true, choices: [
      { name: 'Add', value: 'add' },
      { name: 'Delete', value: 'delete' },
      { name: 'List', value: 'list' },
      { name: 'Clear', value: 'clear' }
    ]},
    { name: 'phrase', description: 'Phrase to highlight', type: ApplicationCommandOptionType.String, required: false }
  ]},
  { name: 'rolepersist', description: 'Toggle role persistence', options: [
    { name: 'toggle', description: 'Enable/disable', type: ApplicationCommandOptionType.String, required: true, choices: [
      { name: 'Enable', value: 'enable' },
      { name: 'Disable', value: 'disable' }
    ]}
  ]}
];

export const registerSlashCommands = async (clientId, token) => {
  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: slashCommands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
};
