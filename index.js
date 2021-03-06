const Discord = require("discord.js");
const Client = require("discord.js");
const MessageEmbed = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");
const fs = require("fs");
const Enmap = require("enmap");

const client = new Discord.Client();
const bot = new Discord.Client();

const queue = new Map();

client.on("ready", () => {
  console.log(`Bot Online, ${client.user.tag}`);
client.user.setPresence({
        game: { 
            name: `${client.guilds.size}, Use cloud!help`,
            type: 'WATCHING'
        },
        status: 'idle'
    })
});

client.on("message", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}queue`)) {
    askqueue(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}pause`)) {
    pause(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}np`)) {
    np(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}help`)) {
    fs.readFile('./commands.txt', 'utf8', function(err, commands) {
    message.channel.send(commands);
    });
    return;
  } else if (message.content.startsWith(`${prefix}resume`)) {
    resume(message, serverQueue);
    return;
  } else {
    message.channel.send("Not a Valid Command");
  }
});

async function execute(message, serverQueue) {
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "You need to be in a voice channel to play music!"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "I need the permissions to join and speak in your voice channel!"
    );
  }

  const songInfo = await ytdl.getInfo(args[1]);
  const song = {
    title: songInfo.title,
    url: songInfo.video_url
  }

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} has been added to the queue!`);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  if (!serverQueue)
    return message.channel.send("There is no song that I could skip!");
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function np(message, serverQueue) {
	if (!serverQueue) return message.channel.send('There is nothing playing.');
	return message.channel.send(`🎶 Now playing: **${serverQueue.songs[0].title}**`);
}

function askqueue(message, serverQueue) {
		if (!serverQueue) return message.channel.send('There is nothing playing.');
		return message.channel.send(`
__**Song queue:**__
${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}
**Now playing:** ${serverQueue.songs[0].title}
		`);
}

function pause(message, serverQueue) {
if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			serverQueue.connection.dispatcher.pause();
			return message.channel.send('Paused the music for you!');
		}
		return message.channel.send('There is nothing playing.');
}

function resume(message, serverQueue) {
		if (serverQueue && !serverQueue.playing) {
			serverQueue.playing = true;
			serverQueue.connection.dispatcher.resume();
			return message.channel.send('Resumed the music for you!');
		}
		return message.channel.send('There is nothing playing.');
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
}

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

client.login(token);
