import { createEmbed, createErrorEmbed, fetchGithubRepo, fetchSpaceStation, fetchItunesSong } from './utils.js';

export const github = async (interaction, args) => {
  const repo = interaction.options?.getString('repository') || args.join('');

  if (!repo) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide a repository (owner/repo).')], ephemeral: true });
  }

  const data = await fetchGithubRepo(repo);
  if (!data) {
    return interaction.reply({ embeds: [createErrorEmbed('Repository not found.')], ephemeral: true });
  }

  const embed = createEmbed('info', `📦 ${data.full_name}`, data.description || 'No description');
  embed.addFields(
    { name: 'Stars', value: data.stargazers_count.toLocaleString(), inline: true },
    { name: 'Forks', value: data.forks_count.toLocaleString(), inline: true },
    { name: 'Open Issues', value: data.open_issues_count.toLocaleString(), inline: true },
    { name: 'Language', value: data.language || 'Unknown', inline: true },
    { name: 'Created', value: `<t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:R>`, inline: true },
    { name: 'Updated', value: `<t:${Math.floor(new Date(data.updated_at).getTime() / 1000)}:R>`, inline: true },
    { name: 'Link', value: `[View on GitHub](${data.html_url})`, inline: false }
  );

  await interaction.reply({ embeds: [embed] });
};

export const space = async (interaction) => {
  const data = await fetchSpaceStation();
  if (!data) {
    return interaction.reply({ embeds: [createErrorEmbed('Failed to fetch ISS data.')], ephemeral: true });
  }

  const astronauts = data.people?.map(p => `${p.name} (${p.craft})`).join('\n') || 'No data';
  const embed = createEmbed('info', `🚀 International Space Station`, null);
  embed.addFields(
    { name: 'People in Space', value: data.number.toString(), inline: true },
    { name: 'Astronauts', value: astronauts.slice(0, 1000), inline: false }
  );

  await interaction.reply({ embeds: [embed] });
};

export const itunes = async (interaction, args) => {
  const query = interaction.options?.getString('song') || args.join(' ');

  if (!query) {
    return interaction.reply({ embeds: [createErrorEmbed('Please provide a song name.')], ephemeral: true });
  }

  const data = await fetchItunesSong(query);
  if (!data) {
    return interaction.reply({ embeds: [createErrorEmbed('Song not found.')], ephemeral: true });
  }

  const embed = createEmbed('info', `🎵 ${data.trackName}`, null);
  embed.setThumbnail(data.artworkUrl100);
  embed.addFields(
    { name: 'Artist', value: data.artistName, inline: true },
    { name: 'Album', value: data.collectionName, inline: true },
    { name: 'Genre', value: data.primaryGenreName, inline: true },
    { name: 'Price', value: `$${data.trackPrice || 'N/A'}`, inline: true },
    { name: 'Released', value: new Date(data.releaseDate).toLocaleDateString(), inline: true },
    { name: 'Preview', value: data.previewUrl ? `[Listen](${data.previewUrl})` : 'Not available', inline: false }
  );

  await interaction.reply({ embeds: [embed] });
};
