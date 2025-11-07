import { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { 
  createEmbed, createErrorEmbed, createSuccessEmbed, createWarningEmbed, createModerationEmbed,
  isModerator, isManager, canModerate,
  parseTime, formatDuration, formatUptime,
  createModLog, getModLogs, getCase, updateCaseReason,
  fetchCatImage, fetchDogImage, fetchPugImage, fetchDadJoke, fetchChuckNorris,
  fetchPokemon, fetchCovidStats
} from './utils.js';
import { storage, startTime } from './config.js';

export const ban = async (interaction, args) => {
  const member = interaction.member;
  
  if (!isModerator(member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const target = interaction.options?.getUser('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''));
  const duration = interaction.options?.getString('duration') || args[1];
  const reason = interaction.options?.getString('reason') || args.slice(2).join(' ');

  if (!target) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a user to ban.')], ephemeral: true });
  }

  const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
  
  if (targetMember && !canModerate(member, targetMember)) {
    return interaction.reply({ embeds: [createErrorEmbed('You cannot ban this user due to role hierarchy.')], ephemeral: true });
  }

  try {
    await interaction.guild.members.ban(target.id, { deleteMessageSeconds: 604800, reason: reason || 'No reason provided' });
    
    const caseNum = createModLog(interaction.guild.id, 'Ban', target, member.user, reason, duration);
    
    const embed = createModerationEmbed('Ban', target, member.user, reason);
    embed.addFields({ name: 'Case', value: `#${caseNum}`, inline: true });
    
    if (duration) {
      const time = parseTime(duration);
      if (time) {
        embed.addFields({ name: 'Duration', value: formatDuration(time), inline: true });
        setTimeout(async () => {
          await interaction.guild.members.unban(target.id).catch(() => {});
        }, time);
      }
    }
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to ban user. Check my permissions.')], ephemeral: true });
  }
};

export const unban = async (interaction, args) => {
  const member = interaction.member;
  
  if (!isModerator(member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const userId = interaction.options?.getString('user') || args[0];
  const reason = interaction.options?.getString('reason') || args.slice(1).join(' ');

  if (!userId) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide a user ID to unban.')], ephemeral: true });
  }

  try {
    const user = await interaction.client.users.fetch(userId);
    await interaction.guild.members.unban(userId, reason || 'No reason provided');
    
    createModLog(interaction.guild.id, 'Unban', user, member.user, reason);
    
    const embed = createModerationEmbed('Unban', user, member.user, reason);
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to unban user. Make sure they are banned.')], ephemeral: true });
  }
};

export const kick = async (interaction, args) => {
  const member = interaction.member;
  
  if (!isModerator(member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const target = interaction.options?.getMember('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''));
  const reason = interaction.options?.getString('reason') || args.slice(1).join(' ');

  if (!target) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a user to kick.')], ephemeral: true });
  }

  if (!canModerate(member, target)) {
    return interaction.reply({ embeds: [createErrorEmbed('You cannot kick this user due to role hierarchy.')], ephemeral: true });
  }

  try {
    await target.kick(reason || 'No reason provided');
    
    const caseNum = createModLog(interaction.guild.id, 'Kick', target.user, member.user, reason);
    
    const embed = createModerationEmbed('Kick', target.user, member.user, reason);
    embed.addFields({ name: 'Case', value: `#${caseNum}`, inline: true });
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to kick user. Check my permissions.')], ephemeral: true });
  }
};

export const mute = async (interaction, args) => {
  const member = interaction.member;
  
  if (!isModerator(member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const target = interaction.options?.getMember('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''));
  const duration = interaction.options?.getString('duration') || args[1];
  const reason = interaction.options?.getString('reason') || args.slice(2).join(' ');

  if (!target) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a user to mute.')], ephemeral: true });
  }

  if (!canModerate(member, target)) {
    return interaction.reply({ embeds: [createErrorEmbed('You cannot mute this user due to role hierarchy.')], ephemeral: true });
  }

  const time = duration ? parseTime(duration) : null;

  try {
    await target.timeout(time || 28 * 24 * 60 * 60 * 1000, reason || 'No reason provided');
    
    const caseNum = createModLog(interaction.guild.id, 'Mute', target.user, member.user, reason, duration);
    
    const embed = createModerationEmbed('Mute', target.user, member.user, reason);
    embed.addFields(
      { name: 'Case', value: `#${caseNum}`, inline: true },
      { name: 'Duration', value: time ? formatDuration(time) : 'Permanent', inline: true }
    );
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to mute user. Check my permissions.')], ephemeral: true });
  }
};

export const unmute = async (interaction, args) => {
  const member = interaction.member;
  
  if (!isModerator(member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const target = interaction.options?.getMember('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''));
  const reason = interaction.options?.getString('reason') || args.slice(1).join(' ');

  if (!target) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a user to unmute.')], ephemeral: true });
  }

  try {
    await target.timeout(null, reason || 'No reason provided');
    
    createModLog(interaction.guild.id, 'Unmute', target.user, member.user, reason);
    
    const embed = createModerationEmbed('Unmute', target.user, member.user, reason);
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to unmute user. Check my permissions.')], ephemeral: true });
  }
};

export const warn = async (interaction, args) => {
  const member = interaction.member;
  
  if (!isModerator(member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const target = interaction.options?.getMember('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''));
  const reason = interaction.options?.getString('reason') || args.slice(1).join(' ');

  if (!target) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a user to warn.')], ephemeral: true });
  }

  if (!storage.warnings.has(interaction.guild.id)) {
    storage.warnings.set(interaction.guild.id, new Map());
  }

  const guildWarnings = storage.warnings.get(interaction.guild.id);
  if (!guildWarnings.has(target.id)) {
    guildWarnings.set(target.id, []);
  }

  const warnId = Date.now().toString();
  const warning = {
    id: warnId,
    userId: target.id,
    userTag: target.user.tag,
    moderatorId: member.id,
    moderatorTag: member.user.tag,
    reason: reason || 'No reason provided',
    timestamp: Date.now()
  };

  guildWarnings.get(target.id).push(warning);
  
  const caseNum = createModLog(interaction.guild.id, 'Warn', target.user, member.user, reason);
  
  const embed = createModerationEmbed('Warning Issued', target.user, member.user, reason);
  embed.addFields(
    { name: 'Case', value: `#${caseNum}`, inline: true },
    { name: 'Total Warnings', value: `${guildWarnings.get(target.id).length}`, inline: true }
  );

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cancel_warn_${warnId}`)
    .setLabel('Cancel ❌')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(cancelButton);

  await interaction.reply({ embeds: [embed], components: [row] });
};

export const softban = async (interaction, args) => {
  const member = interaction.member;
  
  if (!isModerator(member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const target = interaction.options?.getMember('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''));
  const reason = interaction.options?.getString('reason') || args.slice(1).join(' ');

  if (!target) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a user to softban.')], ephemeral: true });
  }

  if (!canModerate(member, target)) {
    return interaction.reply({ embeds: [createErrorEmbed('You cannot softban this user due to role hierarchy.')], ephemeral: true });
  }

  try {
    await interaction.guild.members.ban(target.id, { deleteMessageSeconds: 604800, reason: reason || 'No reason provided' });
    await interaction.guild.members.unban(target.id);
    
    const caseNum = createModLog(interaction.guild.id, 'Softban', target.user, member.user, reason);
    
    const embed = createModerationEmbed('Softban', target.user, member.user, reason);
    embed.addFields({ name: 'Case', value: `#${caseNum}`, inline: true });
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to softban user. Check my permissions.')], ephemeral: true });
  }
};

export const lock = async (interaction, args) => {
  const member = interaction.member;
  
  if (!isModerator(member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const channel = interaction.options?.getChannel('channel') || interaction.channel;
  const duration = interaction.options?.getString('duration') || args[1];
  const message = interaction.options?.getString('message') || args.slice(2).join(' ');

  try {
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: false
    });

    const embed = createSuccessEmbed(`🔒 ${channel} has been locked${message ? `\n\n${message}` : ''}`);
    await interaction.reply({ embeds: [embed], ephemeral: true });

    if (duration) {
      const time = parseTime(duration);
      if (time) {
        setTimeout(async () => {
          await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: null
          });
        }, time);
      }
    }
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to lock channel. Check my permissions.')], ephemeral: true });
  }
};

export const unlock = async (interaction, args) => {
  const member = interaction.member;
  
  if (!isModerator(member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const channel = interaction.options?.getChannel('channel') || interaction.channel;
  const message = interaction.options?.getString('message') || args.slice(1).join(' ');

  try {
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: null
    });

    const embed = createSuccessEmbed(`🔓 ${channel} has been unlocked${message ? `\n\n${message}` : ''}`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to unlock channel. Check my permissions.')], ephemeral: true });
  }
};

export const clean = async (interaction, args) => {
  const member = interaction.member;
  
  if (!isModerator(member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const amount = parseInt(interaction.options?.getInteger('amount') || args[0]) || 10;

  if (amount < 1 || amount > 100) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide a number between 1 and 100.')], ephemeral: true });
  }

  try {
    const botMessages = await interaction.channel.messages.fetch({ limit: amount });
    const toDelete = botMessages.filter(msg => msg.author.id === interaction.client.user.id);
    
    await interaction.channel.bulkDelete(toDelete, true);
    
    const embed = createSuccessEmbed(`Cleaned ${toDelete.size} bot messages.`);
    const reply = await interaction.reply({ embeds: [embed], ephemeral: true });
    
    setTimeout(() => reply.delete().catch(() => {}), 5000);
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to clean messages.')], ephemeral: true });
  }
};

export const deafen = async (interaction, args) => {
  const member = interaction.member;
  
  if (!isModerator(member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const target = interaction.options?.getMember('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''));
  const reason = interaction.options?.getString('reason') || args.slice(1).join(' ');

  if (!target) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a user to deafen.')], ephemeral: true });
  }

  try {
    await target.voice.setDeaf(true, reason || 'No reason provided');
    
    const embed = createModerationEmbed('Deafen', target.user, member.user, reason);
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to deafen user. They must be in a voice channel.')], ephemeral: true });
  }
};

export const undeafen = async (interaction, args) => {
  const member = interaction.member;
  
  if (!isModerator(member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const target = interaction.options?.getMember('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''));
  const reason = interaction.options?.getString('reason') || args.slice(1).join(' ');

  if (!target) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a user to undeafen.')], ephemeral: true });
  }

  try {
    await target.voice.setDeaf(false, reason || 'No reason provided');
    
    const embed = createModerationEmbed('Undeafen', target.user, member.user, reason);
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to undeafen user. They must be in a voice channel.')], ephemeral: true });
  }
};

export const warnings = async (interaction, args) => {
  const target = interaction.options?.getUser('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''))?.user;

  if (!target) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a user.')], ephemeral: true });
  }

  const guildWarnings = storage.warnings.get(interaction.guild.id);
  const userWarnings = guildWarnings?.get(target.id) || [];

  if (userWarnings.length === 0) {
    return interaction.reply({ embeds: [createEmbed('info', 'Warnings', `${target.tag} has no warnings.`)] });
  }

  const embed = createEmbed('warning', `Warnings for ${target.tag}`, null);
  
  userWarnings.slice(0, 10).forEach((warn, index) => {
    embed.addFields({
      name: `Warning #${index + 1}`,
      value: `**Moderator:** ${warn.moderatorTag}\n**Reason:** ${warn.reason}\n**Date:** <t:${Math.floor(warn.timestamp / 1000)}:R>`,
      inline: false
    });
  });

  if (userWarnings.length > 10) {
    embed.setFooter({ text: `Showing 10 of ${userWarnings.length} warnings` });
  }

  await interaction.reply({ embeds: [embed] });
};

export const checkwarnings = warnings;

export const clearwarn = async (interaction, args) => {
  const member = interaction.member;
  
  if (!isModerator(member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const target = interaction.options?.getUser('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''))?.user;

  if (!target) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a user.')], ephemeral: true });
  }

  const guildWarnings = storage.warnings.get(interaction.guild.id);
  if (guildWarnings) {
    guildWarnings.delete(target.id);
  }

  const embed = createSuccessEmbed(`Cleared all warnings for ${target.tag}.`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
};

export const delwarn = async (interaction, args) => {
  const member = interaction.member;
  
  if (!isModerator(member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const target = interaction.options?.getUser('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''))?.user;
  const warnIndex = parseInt(interaction.options?.getInteger('index') || args[1]) - 1;

  if (!target) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a user.')], ephemeral: true });
  }

  const guildWarnings = storage.warnings.get(interaction.guild.id);
  const userWarnings = guildWarnings?.get(target.id) || [];

  if (warnIndex < 0 || warnIndex >= userWarnings.length) {
    return interaction.reply({ embeds: [createErrorEmbed('Invalid warning index.')], ephemeral: true });
  }

  userWarnings.splice(warnIndex, 1);

  const embed = createSuccessEmbed(`Removed warning #${warnIndex + 1} from ${target.tag}.`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
};

export const removewarnings = delwarn;

export const cat = async (interaction) => {
  const url = await fetchCatImage();
  if (!url) {
    return interaction.reply({ embeds: [createErrorEmbed('Failed to fetch cat image.')], ephemeral: true });
  }

  const embed = createEmbed('info', '🐱 Random Cat', null).setImage(url);
  await interaction.reply({ embeds: [embed] });
};

export const dog = async (interaction) => {
  const url = await fetchDogImage();
  if (!url) {
    return interaction.reply({ embeds: [createErrorEmbed('Failed to fetch dog image.')], ephemeral: true });
  }

  const embed = createEmbed('info', '🐶 Random Dog', null).setImage(url);
  await interaction.reply({ embeds: [embed] });
};

export const pug = async (interaction) => {
  const url = await fetchPugImage();
  if (!url) {
    return interaction.reply({ embeds: [createErrorEmbed('Failed to fetch pug image.')], ephemeral: true });
  }

  const embed = createEmbed('info', '🐶 Random Pug', null).setImage(url);
  await interaction.reply({ embeds: [embed] });
};

export const dadjoke = async (interaction) => {
  const joke = await fetchDadJoke();
  if (!joke) {
    return interaction.reply({ embeds: [createErrorEmbed('Failed to fetch dad joke.')], ephemeral: true });
  }

  const embed = createEmbed('info', '😄 Dad Joke', joke);
  await interaction.reply({ embeds: [embed] });
};

export const norris = async (interaction) => {
  const fact = await fetchChuckNorris();
  if (!fact) {
    return interaction.reply({ embeds: [createErrorEmbed('Failed to fetch Chuck Norris fact.')], ephemeral: true });
  }

  const embed = createEmbed('info', '💪 Chuck Norris Fact', fact);
  await interaction.reply({ embeds: [embed] });
};

export const flip = async (interaction) => {
  const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
  const embed = createEmbed('info', '🪙 Coin Flip', `The coin landed on **${result}**!`);
  await interaction.reply({ embeds: [embed] });
};

export const flipcoin = flip;

export const rps = async (interaction, args) => {
  const choices = ['rock', 'paper', 'scissors'];
  const userChoice = (interaction.options?.getString('choice') || args[0])?.toLowerCase();

  if (!userChoice || !choices.includes(userChoice)) {
    return interaction.reply({ embeds: [createErrorEmbed('Please choose rock, paper, or scissors.')], ephemeral: true });
  }

  const botChoice = choices[Math.floor(Math.random() * choices.length)];
  
  let result;
  if (userChoice === botChoice) {
    result = "It's a tie!";
  } else if (
    (userChoice === 'rock' && botChoice === 'scissors') ||
    (userChoice === 'paper' && botChoice === 'rock') ||
    (userChoice === 'scissors' && botChoice === 'paper')
  ) {
    result = 'You win!';
  } else {
    result = 'I win!';
  }

  const embed = createEmbed('info', '✊✋✌️ Rock Paper Scissors', null);
  embed.addFields(
    { name: 'Your Choice', value: userChoice, inline: true },
    { name: 'My Choice', value: botChoice, inline: true },
    { name: 'Result', value: result, inline: false }
  );

  await interaction.reply({ embeds: [embed] });
};

export const poll = async (interaction, args) => {
  if (args[0] === 'show') {
    const messageId = args[1];
    const poll = storage.polls.get(messageId);
    
    if (!poll) {
      return interaction.reply({ embeds: [createErrorEmbed('Poll not found.')], ephemeral: true });
    }

    const embed = createEmbed('info', `📊 ${poll.question}`, null);
    poll.options.forEach((option, index) => {
      const votes = poll.votes[index] || 0;
      const percentage = poll.totalVotes > 0 ? Math.round((votes / poll.totalVotes) * 100) : 0;
      embed.addFields({
        name: `${index + 1}. ${option}`,
        value: `Votes: ${votes} (${percentage}%)`,
        inline: false
      });
    });

    return interaction.reply({ embeds: [embed] });
  }

  const question = interaction.options?.getString('question') || args.join(' ').split('"').filter(s => s.trim())[0];
  const optionsRaw = interaction.options?.getString('options')?.split(',') || args.join(' ').match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, ''));

  if (!question || !optionsRaw || optionsRaw.length < 2) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide a question and at least 2 options in quotes.')], ephemeral: true });
  }

  const options = optionsRaw.slice(0, 10);
  const embed = createEmbed('info', `📊 ${question}`, options.map((opt, i) => `${i + 1}️⃣ ${opt}`).join('\n'));
  
  const msg = await interaction.reply({ embeds: [embed], fetchReply: true });

  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  for (let i = 0; i < options.length; i++) {
    await msg.react(emojis[i]);
  }

  storage.polls.set(msg.id, {
    question,
    options,
    votes: {},
    totalVotes: 0
  });
};

export const roll = async (interaction, args) => {
  const input = interaction.options?.getString('dice') || args[0] || 'd6';
  const count = parseInt(interaction.options?.getInteger('count') || args[1]) || 1;

  const match = input.match(/d(\d+)/i);
  if (!match) {
    return interaction.reply({ embeds: [createErrorEmbed('Invalid dice format. Use d4, d6, d8, d10, d12, d20, or d100.')], ephemeral: true });
  }

  const sides = parseInt(match[1]);
  const validSides = [4, 6, 8, 10, 12, 20, 100];
  
  if (!validSides.includes(sides)) {
    return interaction.reply({ embeds: [createErrorEmbed('Valid dice types: d4, d6, d8, d10, d12, d20, d100.')], ephemeral: true });
  }

  if (count < 1 || count > 20) {
    return interaction.reply({ embeds: [createErrorEmbed('You can roll 1-20 dice at once.')], ephemeral: true });
  }

  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }

  const total = rolls.reduce((a, b) => a + b, 0);
  const embed = createEmbed('info', `🎲 Dice Roll (${count}${input})`, null);
  embed.addFields(
    { name: 'Rolls', value: rolls.join(', '), inline: false },
    { name: 'Total', value: total.toString(), inline: false }
  );

  await interaction.reply({ embeds: [embed] });
};

export const afk = async (interaction, args) => {
  const subcommand = args[0]?.toLowerCase();
  const member = interaction.member;

  if (subcommand === 'set' || (!subcommand || subcommand !== 'ignore' && subcommand !== 'ignored' && subcommand !== 'reset' && subcommand !== 'clear' && subcommand !== 'list')) {
    const status = interaction.options?.getString('status') || args.slice(subcommand === 'set' ? 1 : 0).join(' ') || 'AFK';
    
    if (!storage.afk.has(interaction.guild.id)) {
      storage.afk.set(interaction.guild.id, new Map());
    }

    storage.afk.get(interaction.guild.id).set(member.id, {
      status,
      timestamp: Date.now(),
      ignoredChannels: []
    });

    const embed = createSuccessEmbed(`Your AFK status has been set: ${status}`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (subcommand === 'ignore') {
    const guildAfk = storage.afk.get(interaction.guild.id);
    const userAfk = guildAfk?.get(member.id);

    if (!userAfk) {
      return interaction.reply({ embeds: [createErrorEmbed('You are not AFK.')], ephemeral: true });
    }

    if (!userAfk.ignoredChannels.includes(interaction.channel.id)) {
      userAfk.ignoredChannels.push(interaction.channel.id);
    }

    const embed = createSuccessEmbed(`This channel will be ignored for AFK notifications.`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (subcommand === 'ignored') {
    const guildAfk = storage.afk.get(interaction.guild.id);
    const userAfk = guildAfk?.get(member.id);

    if (!userAfk || userAfk.ignoredChannels.length === 0) {
      return interaction.reply({ embeds: [createEmbed('info', 'Ignored Channels', 'No channels are being ignored.')], ephemeral: true });
    }

    const channels = userAfk.ignoredChannels.map(id => `<#${id}>`).join('\n');
    const embed = createEmbed('info', 'Ignored Channels', channels);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (subcommand === 'reset' || subcommand === 'clear') {
    const target = interaction.options?.getMember('user') || interaction.guild.members.cache.get(args[1]?.replace(/[<@!>]/g, ''));
    const targetMember = target || member;

    const guildAfk = storage.afk.get(interaction.guild.id);
    if (guildAfk) {
      guildAfk.delete(targetMember.id);
    }

    const embed = createSuccessEmbed(`AFK status cleared for ${targetMember.user.tag}.`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (subcommand === 'list') {
    const guildAfk = storage.afk.get(interaction.guild.id);
    if (!guildAfk || guildAfk.size === 0) {
      return interaction.reply({ embeds: [createEmbed('info', 'AFK Users', 'No users are currently AFK.')] });
    }

    const embed = createEmbed('info', 'AFK Users', null);
    let count = 0;
    for (const [userId, data] of guildAfk) {
      if (count >= 10) break;
      const user = await interaction.client.users.fetch(userId).catch(() => null);
      if (user) {
        embed.addFields({
          name: user.tag,
          value: `${data.status}\n<t:${Math.floor(data.timestamp / 1000)}:R>`,
          inline: true
        });
        count++;
      }
    }

    return interaction.reply({ embeds: [embed] });
  }
};

export const whois = async (interaction, args) => {
  const target = interaction.options?.getMember('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, '')) || interaction.member;

  const embed = createEmbed('info', `User Info: ${target.user.tag}`, null);
  embed.setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }));
  embed.addFields(
    { name: 'ID', value: target.id, inline: true },
    { name: 'Nickname', value: target.nickname || 'None', inline: true },
    { name: 'Status', value: target.presence?.status || 'offline', inline: true },
    { name: 'Joined Server', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true },
    { name: 'Account Created', value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`, inline: true },
    { name: 'Roles', value: target.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.toString()).join(', ') || 'None', inline: false }
  );

  await interaction.reply({ embeds: [embed] });
};

export const serverinfo = async (interaction) => {
  const guild = interaction.guild;

  const embed = createEmbed('info', `Server Info: ${guild.name}`, null);
  embed.setThumbnail(guild.iconURL({ dynamic: true, size: 256 }));
  embed.addFields(
    { name: 'ID', value: guild.id, inline: true },
    { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
    { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
    { name: 'Members', value: guild.memberCount.toString(), inline: true },
    { name: 'Channels', value: guild.channels.cache.size.toString(), inline: true },
    { name: 'Roles', value: guild.roles.cache.size.toString(), inline: true },
    { name: 'Emojis', value: guild.emojis.cache.size.toString(), inline: true },
    { name: 'Boost Level', value: `Level ${guild.premiumTier}`, inline: true },
    { name: 'Boosts', value: guild.premiumSubscriptionCount?.toString() || '0', inline: true }
  );

  await interaction.reply({ embeds: [embed] });
};

export const membercount = async (interaction) => {
  const guild = interaction.guild;
  const bots = guild.members.cache.filter(m => m.user.bot).size;
  const humans = guild.memberCount - bots;

  const embed = createEmbed('info', 'Member Count', null);
  embed.addFields(
    { name: 'Total Members', value: guild.memberCount.toString(), inline: true },
    { name: 'Humans', value: humans.toString(), inline: true },
    { name: 'Bots', value: bots.toString(), inline: true }
  );

  await interaction.reply({ embeds: [embed] });
};

export const avatar = async (interaction, args) => {
  const target = interaction.options?.getUser('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''))?.user || interaction.user;

  const embed = createEmbed('info', `${target.tag}'s Avatar`, null);
  embed.setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }));

  await interaction.reply({ embeds: [embed] });
};

export const emotes = async (interaction, args) => {
  const search = interaction.options?.getString('search') || args.join(' ');
  let emojis = interaction.guild.emojis.cache;

  if (search) {
    emojis = emojis.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
  }

  if (emojis.size === 0) {
    return interaction.reply({ embeds: [createEmbed('info', 'Server Emojis', 'No emojis found.')] });
  }

  const emojiList = emojis.map(e => `${e.toString()} \`:${e.name}:\``).join('\n').slice(0, 2000);
  const embed = createEmbed('info', `Server Emojis (${emojis.size})`, emojiList);

  await interaction.reply({ embeds: [embed] });
};

export const remindme = async (interaction, args) => {
  const time = interaction.options?.getString('time') || args[0];
  const reminder = interaction.options?.getString('reminder') || args.slice(1).join(' ');

  if (!time || !reminder) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide a time and reminder.')], ephemeral: true });
  }

  const duration = parseTime(time);
  if (!duration) {
    return interaction.reply({ embeds: [createErrorEmbed('Invalid time format. Use formats like 1h, 30m, 1d.')], ephemeral: true });
  }

  const embed = createSuccessEmbed(`Reminder set for ${formatUptime(duration)}!`);
  await interaction.reply({ embeds: [embed], ephemeral: true });

  setTimeout(async () => {
    try {
      const reminderEmbed = createEmbed('info', '⏰ Reminder', reminder);
      await interaction.user.send({ embeds: [reminderEmbed] });
    } catch (error) {
      console.log('Could not send reminder DM');
    }
  }, duration);
};

export const randomcolor = async (interaction) => {
  const randomHex = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  const embed = createEmbed('info', `🎨 Random Color`, `#${randomHex}`);
  embed.setColor(parseInt(randomHex, 16));

  await interaction.reply({ embeds: [embed] });
};

export const color = async (interaction, args) => {
  let hex = interaction.options?.getString('hex') || args[0];
  
  if (!hex) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide a hex color code.')], ephemeral: true });
  }

  hex = hex.replace('#', '');
  
  if (!/^[0-9A-F]{6}$/i.test(hex)) {
    return interaction.reply({ embeds: [createErrorEmbed('Invalid hex color code.')], ephemeral: true });
  }

  const embed = createEmbed('info', `🎨 Color Preview`, `#${hex}`);
  embed.setColor(parseInt(hex, 16));

  await interaction.reply({ embeds: [embed] });
};

export const distance = async (interaction, args) => {
  const coord1 = interaction.options?.getString('coordinates1') || args[0];
  const coord2 = interaction.options?.getString('coordinates2') || args[1];

  if (!coord1 || !coord2) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide two sets of coordinates (lat,lon).')], ephemeral: true });
  }

  const [lat1, lon1] = coord1.split(',').map(Number);
  const [lat2, lon2] = coord2.split(',').map(Number);

  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return interaction.reply({ embeds: [createErrorEmbed('Invalid coordinates format. Use: lat,lon')], ephemeral: true });
  }

  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  const distanceMiles = distanceKm * 0.621371;

  const embed = createEmbed('info', '📍 Distance Calculator', null);
  embed.addFields(
    { name: 'Distance', value: `${distanceKm.toFixed(2)} km\n${distanceMiles.toFixed(2)} miles`, inline: false }
  );

  await interaction.reply({ embeds: [embed] });
};

export const pokemon = async (interaction, args) => {
  const name = interaction.options?.getString('name') || args[0];

  if (!name) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide a Pokémon name.')], ephemeral: true });
  }

  const data = await fetchPokemon(name);
  if (!data) {
    return interaction.reply({ embeds: [createErrorEmbed('Pokémon not found.')], ephemeral: true });
  }

  const embed = createEmbed('info', `${data.name.charAt(0).toUpperCase() + data.name.slice(1)}`, null);
  embed.setThumbnail(data.sprites.front_default);
  embed.addFields(
    { name: 'ID', value: data.id.toString(), inline: true },
    { name: 'Height', value: `${data.height / 10}m`, inline: true },
    { name: 'Weight', value: `${data.weight / 10}kg`, inline: true },
    { name: 'Types', value: data.types.map(t => t.type.name).join(', '), inline: false }
  );

  await interaction.reply({ embeds: [embed] });
};

export const covid = async (interaction, args) => {
  const location = interaction.options?.getString('location') || args.join(' ');
  
  const data = await fetchCovidStats(location || null);
  if (!data) {
    return interaction.reply({ embeds: [createErrorEmbed('Failed to fetch COVID-19 stats.')], ephemeral: true });
  }

  const embed = createEmbed('info', `🦠 COVID-19 Stats${location ? ` - ${data.data.country || location}` : ' - Global'}`, null);
  embed.addFields(
    { name: 'Cases', value: data.data.cases?.toLocaleString() || '0', inline: true },
    { name: 'Deaths', value: data.data.deaths?.toLocaleString() || '0', inline: true },
    { name: 'Recovered', value: data.data.recovered?.toLocaleString() || '0', inline: true },
    { name: 'Active', value: data.data.active?.toLocaleString() || '0', inline: true },
    { name: 'Today Cases', value: data.data.todayCases?.toLocaleString() || '0', inline: true },
    { name: 'Today Deaths', value: data.data.todayDeaths?.toLocaleString() || '0', inline: true }
  );

  await interaction.reply({ embeds: [embed] });
};

export const uptime = async (interaction) => {
  const uptimeMs = Date.now() - startTime;
  const embed = createEmbed('info', '⏱️ Bot Uptime', formatUptime(uptimeMs));
  await interaction.reply({ embeds: [embed] });
};

export const info = async (interaction) => {
  const embed = createEmbed('info', '🤖 Bot Information', null);
  embed.addFields(
    { name: 'Servers', value: interaction.client.guilds.cache.size.toString(), inline: true },
    { name: 'Users', value: interaction.client.users.cache.size.toString(), inline: true },
    { name: 'Uptime', value: formatUptime(Date.now() - startTime), inline: true },
    { name: 'Ping', value: `${interaction.client.ws.ping}ms`, inline: true }
  );

  await interaction.reply({ embeds: [embed] });
};

export const prefix = async (interaction, args) => {
  const { getPrefix, setPrefix } = await import('./config.js');
  const currentPrefix = getPrefix(interaction.guild.id);

  if (!args[0] && !interaction.options?.getString('new_prefix')) {
    const embed = createEmbed('info', 'Server Prefix', `Current prefix: \`${currentPrefix}\``);
    return interaction.reply({ embeds: [embed] });
  }

  if (!isManager(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need manager permissions to change the prefix.')], ephemeral: true });
  }

  const newPrefix = interaction.options?.getString('new_prefix') || args[0];

  if (newPrefix.length > 5) {
    return interaction.reply({ embeds: [createErrorEmbed('Prefix must be 5 characters or less.')], ephemeral: true });
  }

  setPrefix(interaction.guild.id, newPrefix);

  const embed = createSuccessEmbed(`Prefix changed to: \`${newPrefix}\``);
  await interaction.reply({ embeds: [embed], ephemeral: true });
};

export const addrole = async (interaction, args) => {
  if (!isManager(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need manager permissions to use this command.')], ephemeral: true });
  }

  const roleName = interaction.options?.getString('name') || args[0];
  const color = interaction.options?.getString('color') || args[1];
  const hoist = interaction.options?.getBoolean('hoist') || args[2] === 'true';

  if (!roleName) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide a role name.')], ephemeral: true });
  }

  try {
    const roleColor = color ? (color.startsWith('#') ? color : `#${color}`) : null;
    const role = await interaction.guild.roles.create({
      name: roleName,
      color: roleColor,
      hoist: hoist
    });

    const embed = createSuccessEmbed(`Role ${role} created successfully.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to create role. Check my permissions.')], ephemeral: true });
  }
};

export const delrole = async (interaction, args) => {
  if (!isManager(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need manager permissions to use this command.')], ephemeral: true });
  }

  const role = interaction.options?.getRole('role') || interaction.guild.roles.cache.find(r => r.name === args.join(' ') || r.id === args[0]);

  if (!role) {
    return interaction.reply({ embeds: [createErrorEmbed('Role not found.')], ephemeral: true });
  }

  try {
    const roleName = role.name;
    await role.delete();

    const embed = createSuccessEmbed(`Role **${roleName}** deleted successfully.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to delete role. Check my permissions and role hierarchy.')], ephemeral: true });
  }
};

export const announce = async (interaction, args) => {
  if (!isManager(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need manager permissions to use this command.')], ephemeral: true });
  }

  const text = interaction.options?.getString('text');
  const channel = interaction.options?.getChannel('channel');
  const useEmbed = interaction.options?.getString('use_embed');
  const url = interaction.options?.getString('url');
  const urlTitle = interaction.options?.getString('url_title');
  const imageUrl = interaction.options?.getString('image');

  if (!text || !channel) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide announcement text and channel.')], ephemeral: true });
  }

  try {
    if (useEmbed === 'yes') {
      const embed = createEmbed('info', '📢 Announcement', text);
      embed.setColor(0x5865F2);
      embed.setFooter({ text: `Announced by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
      embed.setTimestamp();

      if (imageUrl) {
        embed.setImage(imageUrl);
      }

      const components = [];
      if (url && urlTitle) {
        const button = new ButtonBuilder()
          .setLabel(urlTitle)
          .setURL(url)
          .setStyle(ButtonStyle.Link);
        const row = new ActionRowBuilder().addComponents(button);
        components.push(row);
      }

      await channel.send({ embeds: [embed], components });
    } else {
      let message = `**📢 ANNOUNCEMENT**\n\n${text}`;
      if (url) {
        message += `\n\n🔗 ${urlTitle || 'Link'}: ${url}`;
      }
      await channel.send(message);
    }

    const embed = createSuccessEmbed(`Announcement sent to ${channel}.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to send announcement. Check my permissions.')], ephemeral: true });
  }
};

export const purge = async (interaction, args) => {
  if (!isManager(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need manager permissions to use this command.')], ephemeral: true });
  }

  const amount = parseInt(interaction.options?.getInteger('amount') || args[0]);

  if (!amount || amount < 1 || amount > 1000) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide a number between 1 and 1000.')], ephemeral: true });
  }

  try {
    const messages = await interaction.channel.messages.fetch({ limit: Math.min(amount, 100) });
    const deleted = await interaction.channel.bulkDelete(messages, true);

    const embed = createSuccessEmbed(`Purged ${deleted.size} messages.`);
    const reply = await interaction.reply({ embeds: [embed], ephemeral: true });

    setTimeout(() => reply.delete().catch(() => {}), 5000);
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to purge messages. Messages may be older than 14 days.')], ephemeral: true });
  }
};

export const setnick = async (interaction, args) => {
  if (!isManager(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need manager permissions to use this command.')], ephemeral: true });
  }

  const member = interaction.options?.getMember('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''));
  const nickname = interaction.options?.getString('nickname') || args.slice(1).join(' ');

  if (!member) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a user.')], ephemeral: true });
  }

  try {
    await member.setNickname(nickname || null);

    const embed = createSuccessEmbed(`Nickname for ${member.user.tag} ${nickname ? `set to: ${nickname}` : 'reset'}.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to set nickname. Check permissions and role hierarchy.')], ephemeral: true });
  }
};

export const rolename = async (interaction, args) => {
  if (!isManager(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need manager permissions to use this command.')], ephemeral: true });
  }

  const parts = args.join(' ').split(',');
  const role = interaction.guild.roles.cache.find(r => r.name === parts[0]?.trim() || r.id === parts[0]?.trim());
  const newName = interaction.options?.getString('new_name') || parts[1]?.trim();

  if (!role || !newName) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide a role and new name.')], ephemeral: true });
  }

  try {
    const oldName = role.name;
    await role.setName(newName);

    const embed = createSuccessEmbed(`Role **${oldName}** renamed to **${newName}**.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to rename role. Check my permissions.')], ephemeral: true });
  }
};

export const rolecolor = async (interaction, args) => {
  if (!isManager(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need manager permissions to use this command.')], ephemeral: true });
  }

  const role = interaction.options?.getRole('role') || interaction.guild.roles.cache.find(r => r.name === args[0] || r.id === args[0]);
  const color = interaction.options?.getString('color') || args[1];

  if (!role || !color) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide a role and hex color.')], ephemeral: true });
  }

  try {
    const hexColor = color.startsWith('#') ? color : `#${color}`;
    await role.setColor(hexColor);

    const embed = createSuccessEmbed(`Color for ${role} set to ${hexColor}.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to set role color. Check the hex format.')], ephemeral: true });
  }
};

export const mentionable = async (interaction, args) => {
  if (!isManager(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need manager permissions to use this command.')], ephemeral: true });
  }

  const role = interaction.options?.getRole('role') || interaction.guild.roles.cache.find(r => r.name === args[0] || r.id === args[0]);
  const mentionable = interaction.options?.getBoolean('mentionable') ?? (args[1] === 'true' ? true : args[1] === 'false' ? false : !role?.mentionable);

  if (!role) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide a role.')], ephemeral: true });
  }

  try {
    await role.setMentionable(mentionable);

    const embed = createSuccessEmbed(`${role} is now ${mentionable ? 'mentionable' : 'not mentionable'}.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to change role mentionable status.')], ephemeral: true });
  }
};

export const ignorechannel = async (interaction, args) => {
  if (!isManager(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need manager permissions to use this command.')], ephemeral: true });
  }

  const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args[0]?.replace(/[<#>]/g, ''));

  if (!channel) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a channel.')], ephemeral: true });
  }

  if (!storage.ignoredChannels.has(interaction.guild.id)) {
    storage.ignoredChannels.set(interaction.guild.id, new Set());
  }

  const ignored = storage.ignoredChannels.get(interaction.guild.id);
  
  if (ignored.has(channel.id)) {
    ignored.delete(channel.id);
    const embed = createSuccessEmbed(`${channel} is no longer ignored.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else {
    ignored.add(channel.id);
    const embed = createSuccessEmbed(`${channel} is now ignored for commands.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export const ignoreuser = async (interaction, args) => {
  if (!isManager(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need manager permissions to use this command.')], ephemeral: true });
  }

  const user = interaction.options?.getUser('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''))?.user;

  if (!user) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a user.')], ephemeral: true });
  }

  if (!storage.ignoredUsers.has(interaction.guild.id)) {
    storage.ignoredUsers.set(interaction.guild.id, new Set());
  }

  const ignored = storage.ignoredUsers.get(interaction.guild.id);
  
  if (ignored.has(user.id)) {
    ignored.delete(user.id);
    const embed = createSuccessEmbed(`${user.tag} is no longer ignored.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else {
    ignored.add(user.id);
    const embed = createSuccessEmbed(`${user.tag} is now ignored for commands.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export const ignorerole = async (interaction, args) => {
  if (!isManager(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need manager permissions to use this command.')], ephemeral: true });
  }

  const role = interaction.options?.getRole('role') || interaction.guild.roles.cache.find(r => r.name === args[0] || r.id === args[0]);

  if (!role) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a role.')], ephemeral: true });
  }

  if (!storage.ignoredRoles.has(interaction.guild.id)) {
    storage.ignoredRoles.set(interaction.guild.id, new Set());
  }

  const ignored = storage.ignoredRoles.get(interaction.guild.id);
  
  if (ignored.has(role.id)) {
    ignored.delete(role.id);
    const embed = createSuccessEmbed(`${role} is no longer ignored.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else {
    ignored.add(role.id);
    const embed = createSuccessEmbed(`${role} is now ignored for commands.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export const role = async (interaction, args) => {
  if (!isManager(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need manager permissions to use this command.')], ephemeral: true });
  }

  const subcommand = args[0]?.toLowerCase();

  if (subcommand === 'status') {
    const embed = createEmbed('info', 'Role Operation Status', 'No active role operations.');
    return interaction.reply({ embeds: [embed] });
  }

  if (subcommand === 'cancel') {
    const embed = createSuccessEmbed('No active role operations to cancel.');
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (subcommand === 'add') {
    const member = interaction.guild.members.cache.get(args[1]?.replace(/[<@!>]/g, ''));
    const roleNames = args.slice(2).join(' ').split(',').map(r => r.trim());

    if (!member || roleNames.length === 0) {
      return interaction.reply({ embeds: [createErrorEmbed('Please provide a user and roles.')], ephemeral: true });
    }

    const roles = [];
    for (const name of roleNames) {
      const role = interaction.guild.roles.cache.find(r => r.name === name || r.id === name.replace(/[<@&>]/g, ''));
      if (role) roles.push(role);
    }

    if (roles.length === 0) {
      return interaction.reply({ embeds: [createErrorEmbed('No valid roles found.')], ephemeral: true });
    }

    try {
      await member.roles.add(roles);
      const embed = createSuccessEmbed(`Added ${roles.length} role(s) to ${member.user.tag}.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      return interaction.reply({ embeds: [createErrorEmbed('Failed to add roles. Check permissions.')], ephemeral: true });
    }
  }

  if (subcommand === 'remove') {
    const member = interaction.guild.members.cache.get(args[1]?.replace(/[<@!>]/g, ''));
    const roleNames = args.slice(2).join(' ').split(',').map(r => r.trim());

    if (!member || roleNames.length === 0) {
      return interaction.reply({ embeds: [createErrorEmbed('Please provide a user and roles.')], ephemeral: true });
    }

    const roles = [];
    for (const name of roleNames) {
      const role = interaction.guild.roles.cache.find(r => r.name === name || r.id === name.replace(/[<@&>]/g, ''));
      if (role) roles.push(role);
    }

    try {
      await member.roles.remove(roles);
      const embed = createSuccessEmbed(`Removed ${roles.length} role(s) from ${member.user.tag}.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      return interaction.reply({ embeds: [createErrorEmbed('Failed to remove roles. Check permissions.')], ephemeral: true });
    }
  }

  const member = interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''));
  const roleOperations = args.slice(1).join(' ').split(',').map(r => r.trim());

  if (!member || roleOperations.length === 0) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide a user and roles with +/- prefix.')], ephemeral: true });
  }

  const toAdd = [];
  const toRemove = [];

  for (const op of roleOperations) {
    if (op.startsWith('+')) {
      const roleName = op.slice(1);
      const role = interaction.guild.roles.cache.find(r => r.name === roleName || r.id === roleName.replace(/[<@&>]/g, ''));
      if (role) toAdd.push(role);
    } else if (op.startsWith('-')) {
      const roleName = op.slice(1);
      const role = interaction.guild.roles.cache.find(r => r.name === roleName || r.id === roleName.replace(/[<@&>]/g, ''));
      if (role) toRemove.push(role);
    }
  }

  try {
    if (toAdd.length > 0) await member.roles.add(toAdd);
    if (toRemove.length > 0) await member.roles.remove(toRemove);

    const embed = createSuccessEmbed(`Updated roles for ${member.user.tag}.\nAdded: ${toAdd.length}, Removed: ${toRemove.length}`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to update roles. Check permissions.')], ephemeral: true });
  }
};

export const ranks = async (interaction) => {
  const guildRanks = storage.ranks.get(interaction.guild.id) || new Map();

  if (guildRanks.size === 0) {
    return interaction.reply({ embeds: [createEmbed('info', 'Joinable Ranks', 'No ranks available.')] });
  }

  const embed = createEmbed('info', 'Joinable Ranks', null);
  for (const [roleId, rankData] of guildRanks) {
    const role = interaction.guild.roles.cache.get(roleId);
    if (role) {
      embed.addFields({ name: role.name, value: `Members: ${role.members.size}`, inline: true });
    }
  }

  await interaction.reply({ embeds: [embed] });
};

export const addrank = async (interaction, args) => {
  if (!isManager(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need manager permissions to use this command.')], ephemeral: true });
  }

  const roleName = interaction.options?.getString('role') || args.join(' ');
  const role = interaction.guild.roles.cache.find(r => r.name === roleName || r.id === roleName.replace(/[<@&>]/g, ''));

  if (!role) {
    return interaction.reply({ embeds: [createErrorEmbed('Role not found.')], ephemeral: true });
  }

  if (!storage.ranks.has(interaction.guild.id)) {
    storage.ranks.set(interaction.guild.id, new Map());
  }

  storage.ranks.get(interaction.guild.id).set(role.id, { name: role.name });

  const embed = createSuccessEmbed(`${role} added as a joinable rank.`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
};

export const delrank = async (interaction, args) => {
  if (!isManager(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need manager permissions to use this command.')], ephemeral: true });
  }

  const roleName = interaction.options?.getString('role') || args.join(' ');
  const role = interaction.guild.roles.cache.find(r => r.name === roleName || r.id === roleName.replace(/[<@&>]/g, ''));

  if (!role) {
    return interaction.reply({ embeds: [createErrorEmbed('Role not found.')], ephemeral: true });
  }

  const guildRanks = storage.ranks.get(interaction.guild.id);
  if (guildRanks) {
    guildRanks.delete(role.id);
  }

  const embed = createSuccessEmbed(`${role} removed from joinable ranks.`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
};

export const rank = async (interaction, args) => {
  const roleName = interaction.options?.getString('rank') || args.join(' ');
  const role = interaction.guild.roles.cache.find(r => r.name === roleName || r.id === roleName.replace(/[<@&>]/g, ''));

  if (!role) {
    return interaction.reply({ embeds: [createErrorEmbed('Rank not found.')], ephemeral: true });
  }

  const guildRanks = storage.ranks.get(interaction.guild.id);
  if (!guildRanks || !guildRanks.has(role.id)) {
    return interaction.reply({ embeds: [createErrorEmbed('This is not a joinable rank.')], ephemeral: true });
  }

  const member = interaction.member;

  try {
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role);
      const embed = createSuccessEmbed(`You left the ${role} rank.`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      await member.roles.add(role);
      const embed = createSuccessEmbed(`You joined the ${role} rank.`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    await interaction.reply({ embeds: [createErrorEmbed('Failed to toggle rank. Check permissions.')], ephemeral: true });
  }
};

export const roles = async (interaction, args) => {
  const search = interaction.options?.getString('search') || args.join(' ');
  let roles = interaction.guild.roles.cache.filter(r => r.id !== interaction.guild.id);

  if (search) {
    roles = roles.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  }

  if (roles.size === 0) {
    return interaction.reply({ embeds: [createEmbed('info', 'Server Roles', 'No roles found.')] });
  }

  const roleList = roles.map(r => `${r} - Members: ${r.members.size}`).join('\n').slice(0, 4000);
  const embed = createEmbed('info', `Server Roles (${roles.size})`, roleList);

  await interaction.reply({ embeds: [embed] });
};

export const roleinfo = async (interaction, args) => {
  const role = interaction.options?.getRole('role') || interaction.guild.roles.cache.find(r => r.name === args.join(' ') || r.id === args[0]);

  if (!role) {
    return interaction.reply({ embeds: [createErrorEmbed('Role not found.')], ephemeral: true });
  }

  const embed = createEmbed('info', `Role Info: ${role.name}`, null);
  embed.setColor(role.color);
  embed.addFields(
    { name: 'ID', value: role.id, inline: true },
    { name: 'Color', value: role.hexColor, inline: true },
    { name: 'Position', value: role.position.toString(), inline: true },
    { name: 'Members', value: role.members.size.toString(), inline: true },
    { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
    { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
    { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true }
  );

  await interaction.reply({ embeds: [embed] });
};

export const members = async (interaction, args) => {
  const role = interaction.options?.getRole('role') || interaction.guild.roles.cache.find(r => r.name === args.join(' ') || r.id === args[0]);

  if (!role) {
    return interaction.reply({ embeds: [createErrorEmbed('Role not found.')], ephemeral: true });
  }

  const memberList = role.members.map(m => m.user.tag).slice(0, 90).join('\n') || 'No members';
  const embed = createEmbed('info', `Members with ${role.name} (${role.members.size})`, memberList);

  if (role.members.size > 90) {
    embed.setFooter({ text: 'Showing first 90 members' });
  }

  await interaction.reply({ embeds: [embed] });
};

export const modlogs = async (interaction, args) => {
  if (!isModerator(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const target = interaction.options?.getUser('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''))?.user;

  if (!target) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a user.')], ephemeral: true });
  }

  const logs = getModLogs(interaction.guild.id, target.id);

  if (logs.length === 0) {
    return interaction.reply({ embeds: [createEmbed('info', 'Mod Logs', `${target.tag} has no moderation logs.`)] });
  }

  const embed = createEmbed('moderation', `Mod Logs for ${target.tag}`, null);

  logs.slice(-10).reverse().forEach(log => {
    embed.addFields({
      name: `Case #${log.caseId} - ${log.action}`,
      value: `**Moderator:** ${log.moderatorTag}\n**Reason:** ${log.reason}\n**Date:** <t:${Math.floor(log.timestamp / 1000)}:R>`,
      inline: false
    });
  });

  if (logs.length > 10) {
    embed.setFooter({ text: `Showing 10 of ${logs.length} logs` });
  }

  await interaction.reply({ embeds: [embed] });
};

export const caseCmd = async (interaction, args) => {
  if (!isModerator(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const caseId = parseInt(interaction.options?.getInteger('case_id') || args[0]);

  if (!caseId || isNaN(caseId)) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide a valid case ID.')], ephemeral: true });
  }

  const caseData = getCase(interaction.guild.id, caseId);

  if (!caseData) {
    return interaction.reply({ embeds: [createErrorEmbed('Case not found.')], ephemeral: true });
  }

  const embed = createEmbed('moderation', `Case #${caseId} - ${caseData.action}`, null);
  embed.addFields(
    { name: 'User', value: `${caseData.userTag} (${caseData.userId})`, inline: true },
    { name: 'Moderator', value: `${caseData.moderatorTag}`, inline: true },
    { name: 'Date', value: `<t:${Math.floor(caseData.timestamp / 1000)}:R>`, inline: true },
    { name: 'Reason', value: caseData.reason, inline: false }
  );

  if (caseData.duration) {
    embed.addFields({ name: 'Duration', value: caseData.duration, inline: true });
  }

  await interaction.reply({ embeds: [embed] });
};

export const reason = async (interaction, args) => {
  if (!isModerator(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const caseId = parseInt(interaction.options?.getInteger('case_id') || args[0]);
  const newReason = interaction.options?.getString('reason') || args.slice(1).join(' ');

  if (!caseId || isNaN(caseId) || !newReason) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide a case ID and new reason.')], ephemeral: true });
  }

  const success = updateCaseReason(interaction.guild.id, caseId, newReason);

  if (!success) {
    return interaction.reply({ embeds: [createErrorEmbed('Case not found.')], ephemeral: true });
  }

  const embed = createSuccessEmbed(`Updated reason for case #${caseId}.`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
};

export const notes = async (interaction, args) => {
  const target = interaction.options?.getUser('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''))?.user;

  if (!target) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a user.')], ephemeral: true });
  }

  const guildNotes = storage.notes.get(interaction.guild.id);
  const userNotes = guildNotes?.get(target.id) || [];

  if (userNotes.length === 0) {
    return interaction.reply({ embeds: [createEmbed('info', 'Notes', `${target.tag} has no notes.`)] });
  }

  const embed = createEmbed('info', `Notes for ${target.tag}`, null);

  userNotes.slice(-10).forEach((note, index) => {
    embed.addFields({
      name: `Note #${index + 1}`,
      value: `**Moderator:** ${note.moderatorTag}\n**Note:** ${note.text}\n**Date:** <t:${Math.floor(note.timestamp / 1000)}:R>`,
      inline: false
    });
  });

  if (userNotes.length > 10) {
    embed.setFooter({ text: `Showing 10 of ${userNotes.length} notes` });
  }

  await interaction.reply({ embeds: [embed] });
};

export const note = async (interaction, args) => {
  if (!isModerator(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const target = interaction.options?.getUser('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''))?.user;
  const text = interaction.options?.getString('text') || args.slice(1).join(' ');

  if (!target || !text) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide a user and note text.')], ephemeral: true });
  }

  if (!storage.notes.has(interaction.guild.id)) {
    storage.notes.set(interaction.guild.id, new Map());
  }

  const guildNotes = storage.notes.get(interaction.guild.id);
  if (!guildNotes.has(target.id)) {
    guildNotes.set(target.id, []);
  }

  guildNotes.get(target.id).push({
    id: Date.now().toString(),
    moderatorId: interaction.user.id,
    moderatorTag: interaction.user.tag,
    text,
    timestamp: Date.now()
  });

  const embed = createSuccessEmbed(`Note added for ${target.tag}.`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
};

export const delnote = async (interaction, args) => {
  if (!isModerator(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const target = interaction.options?.getUser('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''))?.user;
  const noteIndex = parseInt(interaction.options?.getInteger('note_id') || args[1]) - 1;

  if (!target) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a user.')], ephemeral: true });
  }

  const guildNotes = storage.notes.get(interaction.guild.id);
  const userNotes = guildNotes?.get(target.id) || [];

  if (noteIndex < 0 || noteIndex >= userNotes.length) {
    return interaction.reply({ embeds: [createErrorEmbed('Invalid note ID.')], ephemeral: true });
  }

  userNotes.splice(noteIndex, 1);

  const embed = createSuccessEmbed(`Deleted note #${noteIndex + 1} for ${target.tag}.`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
};

export const clearnotes = async (interaction, args) => {
  if (!isModerator(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const target = interaction.options?.getUser('user') || interaction.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, ''))?.user;

  if (!target) {
    return interaction.reply({ embeds: [createErrorEmbed('Please specify a user.')], ephemeral: true });
  }

  const guildNotes = storage.notes.get(interaction.guild.id);
  if (guildNotes) {
    guildNotes.delete(target.id);
  }

  const embed = createSuccessEmbed(`Cleared all notes for ${target.tag}.`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
};

export const giveaway = async (interaction, args) => {
  if (!isManager(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need manager permissions to use this command.')], ephemeral: true });
  }

  const subcommand = args[0]?.toLowerCase();

  if (subcommand === 'create') {
    const channel = interaction.guild.channels.cache.get(args[1]?.replace(/[<#>]/g, ''));
    const winners = parseInt(args[2]) || 1;
    const duration = args[3];
    const prize = args.slice(4).join(' ');

    if (!channel || !duration || !prize) {
      return interaction.reply({ embeds: [createErrorEmbed('Usage: giveaway create [channel] [winners] [duration] [prize]')], ephemeral: true });
    }

    const time = parseTime(duration);
    if (!time) {
      return interaction.reply({ embeds: [createErrorEmbed('Invalid duration format.')], ephemeral: true });
    }

    const embed = createEmbed('info', '🎉 GIVEAWAY 🎉', `Prize: **${prize}**`);
    embed.addFields(
      { name: 'Winners', value: winners.toString(), inline: true },
      { name: 'Duration', value: formatDuration(time), inline: true },
      { name: 'Hosted by', value: interaction.user.tag, inline: true }
    );
    embed.setFooter({ text: 'React with 🎉 to enter!' });

    const msg = await channel.send({ embeds: [embed] });
    await msg.react('🎉');

    storage.giveaways.set(msg.id, {
      prize,
      winners,
      endTime: Date.now() + time,
      channelId: channel.id,
      hostId: interaction.user.id
    });

    const replyEmbed = createSuccessEmbed(`Giveaway started in ${channel}!`);
    await interaction.reply({ embeds: [replyEmbed], ephemeral: true });

    setTimeout(async () => {
      const giveaway = storage.giveaways.get(msg.id);
      if (!giveaway) return;

      const message = await channel.messages.fetch(msg.id).catch(() => null);
      if (!message) return;

      const reaction = message.reactions.cache.get('🎉');
      if (!reaction) return;

      const users = await reaction.users.fetch();
      const validUsers = users.filter(u => !u.bot);

      if (validUsers.size === 0) {
        const noWinnerEmbed = createEmbed('error', '🎉 Giveaway Ended', `No valid entries for **${prize}**`);
        await channel.send({ embeds: [noWinnerEmbed] });
        storage.giveaways.delete(msg.id);
        return;
      }

      const winnerArray = Array.from(validUsers.values());
      const selectedWinners = [];

      for (let i = 0; i < Math.min(winners, winnerArray.length); i++) {
        const randomIndex = Math.floor(Math.random() * winnerArray.length);
        selectedWinners.push(winnerArray.splice(randomIndex, 1)[0]);
      }

      const winnerMentions = selectedWinners.map(w => `<@${w.id}>`).join(', ');
      const winnerEmbed = createEmbed('success', '🎉 Giveaway Ended', `**Prize:** ${prize}\n**Winners:** ${winnerMentions}`);
      await channel.send({ content: winnerMentions, embeds: [winnerEmbed] });

      storage.giveaways.delete(msg.id);
    }, time);
  } else if (subcommand === 'end') {
    const messageId = args[1];
    const giveaway = storage.giveaways.get(messageId);

    if (!giveaway) {
      return interaction.reply({ embeds: [createErrorEmbed('Giveaway not found.')], ephemeral: true });
    }

    const channel = interaction.guild.channels.cache.get(giveaway.channelId);
    if (!channel) {
      return interaction.reply({ embeds: [createErrorEmbed('Giveaway channel not found.')], ephemeral: true });
    }

    storage.giveaways.delete(messageId);

    const embed = createSuccessEmbed('Giveaway ended manually.');
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export const highlights = async (interaction, args) => {
  const action = interaction.options?.getString('action') || args[0]?.toLowerCase();
  const phrase = interaction.options?.getString('phrase') || args.slice(1).join(' ');

  if (action === 'add') {
    if (!phrase) {
      return interaction.reply({ embeds: [createErrorEmbed('Please provide a phrase.')], ephemeral: true });
    }

    if (!storage.highlights.has(interaction.guild.id)) {
      storage.highlights.set(interaction.guild.id, new Map());
    }

    const guildHighlights = storage.highlights.get(interaction.guild.id);
    if (!guildHighlights.has(interaction.user.id)) {
      guildHighlights.set(interaction.user.id, []);
    }

    guildHighlights.get(interaction.user.id).push(phrase.toLowerCase());

    const embed = createSuccessEmbed(`Added highlight: "${phrase}"`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (action === 'delete') {
    const guildHighlights = storage.highlights.get(interaction.guild.id);
    const userHighlights = guildHighlights?.get(interaction.user.id) || [];

    const index = userHighlights.indexOf(phrase.toLowerCase());
    if (index > -1) {
      userHighlights.splice(index, 1);
      const embed = createSuccessEmbed(`Removed highlight: "${phrase}"`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [createErrorEmbed('Highlight not found.')], ephemeral: true });
    }
  } else if (action === 'list') {
    const guildHighlights = storage.highlights.get(interaction.guild.id);
    const userHighlights = guildHighlights?.get(interaction.user.id) || [];

    if (userHighlights.length === 0) {
      return interaction.reply({ embeds: [createEmbed('info', 'Your Highlights', 'No highlights set.')], ephemeral: true });
    }

    const embed = createEmbed('info', 'Your Highlights', userHighlights.map((h, i) => `${i + 1}. ${h}`).join('\n'));
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (action === 'clear') {
    const guildHighlights = storage.highlights.get(interaction.guild.id);
    if (guildHighlights) {
      guildHighlights.delete(interaction.user.id);
    }

    const embed = createSuccessEmbed('Cleared all your highlights.');
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export const rolepersist = async (interaction, args) => {
  if (!isModerator(interaction.member)) {
    return interaction.reply({ embeds: [createErrorEmbed('You need moderator permissions to use this command.')], ephemeral: true });
  }

  const toggle = interaction.options?.getString('toggle');

  if (toggle === 'enable') {
    storage.rolePersist.set(interaction.guild.id, true);
    const embed = createSuccessEmbed('Role persistence enabled for this server.');
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (toggle === 'disable') {
    storage.rolePersist.delete(interaction.guild.id);
    const embed = createSuccessEmbed('Role persistence disabled for this server.');
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
