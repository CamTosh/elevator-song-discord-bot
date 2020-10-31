require('dotenv/config');
const fs = require('fs');
const Discord = require('discord.js');
require('@discordjs/opus');
const prexit = require('prexit')

const { TOKEN, ADMIN_USER_ID } = process.env;
if(!TOKEN) {
    throw new Error('Invalid TOKEN');
}

if(!ADMIN_USER_ID) {
    throw new Error('Invalid ADMIN_USER_ID');
}

// https://github.com/discordjs/discord.js/issues/2992#issuecomment-458584227
const { Readable } = require('stream');

const SILENCE_FRAME = Buffer.from([0xF8, 0xFF, 0xFE]);

class Silence extends Readable {
  _read() {
    this.push(SILENCE_FRAME);
  }
}

const client = new Discord.Client();

const config = {
    song: './song/bensound-theelevatorbossanova.ogg',
    codec: 'ogg/opus',
    volume: 0.5, // 0.0 to 1
    admin: ADMIN_USER_ID,
    minUsersToStartBot: 1, // minimum number of user to start song
    waitBeforeStart: 10, // seconds of silent to wait before start song
}
const manager = {
    start: null,
    end: null,
    diff: null,
    playing: false,
    connection: null,
    dispatcher: null,
    interval: null,
};
manager.diffWithNow = () => ((new Date()).getTime() - manager.end.getTime()) / 1000;

const log = (content) => console.log(`[${new Date().toISOString()}] ${content}`);

client.once('ready', () => log('Ready!'));
//client.on('debug', console.log);

client.on('message', async (message) => {

    if (message.content === '!ping') {
        message.channel.send('Pong.');
    }

    const { channel } = message.member.voice;
    
    if (!channel.joinable) {
        log('Missing joinable permission');
        return message.reply(`I don't have permission to join that voice channel!`);
    }
    if (!channel.speakable) {
        log('Missing speak permission');
        return message.reply(`I don't have permission to speak in that voice channel!`);
    }

    //channel.join().then(connection => { connection.on('debug', console.log);});
    
    const { author } = message;
	if (message.content === '!elevator' && author.id === config.admin) {
        log(`${author.username} invite bot to ${channel.name}`);
        const connection = await channel.join();
        
        connection.play(new Silence(), { type: 'opus' });
        log('Connection is now fully established');
        manager.connection =  connection;

        connection.on('speaking', (user, speaking) => {
            log(`[speak] ${user.username}, bitfield: ${speaking.bitfield}`);
            const isSpeaking = speaking.bitfield === 1;

            if (isSpeaking) {
                manager.start = new Date();
                if(manager.interval) {
                    clearInterval(manager.interval);
                    manager.interval = null;
                }
                if (manager.playing) stop();
            }

            if (!isSpeaking) {
                console.log('stop')

                if(user.bot) return ; // don't talk with bot
                if(manager.interval) return ;

                const channelUsers = []
                channel.members.forEach((value, key) => {
                    if(!value.user.bot) channelUsers.push(value.user)
                });

                if (channelUsers.length < config.minUsersToStartBot) return ;

                manager.end = new Date();
                log(`Silent start at ${manager.end.toISOString()}`);


                manager.interval = setInterval(() => {
                    log(manager.diffWithNow());
                    if(manager.diffWithNow() >= config.waitBeforeStart) {
                        play();
                    }
                }, 1000);
            }
            
        });
    }

});

const play = () => {
    clearInterval(manager.interval);
    if(manager.playing) return ;

    log(`🎵 Play song (vol: ${config.volume})`);
    manager.playing = true;
    manager.dispatcher = connection.play(fs.createReadStream(config.song), {
        type: config.codec,
        volume: config.volume
    });

    manager.dispatcher.on('finish', () => log('🎵 Song finished'));
    manager.dispatcher.on('error', console.error);
};

const stop = () => {
    manager.end = new Date();
    log(`🎵 Stop song (Song has play ${manager.diffWithNow()} seconds)`);

    manager.dispatcher.destroy();
    manager.dispatcher = null;
    manager.playing = false;
    manager.end = null;
};

client.login(TOKEN);

prexit(async () => {
    if(manager.playing) stop();
    if(manager.connection) {
        await manager.connection.disconnect();
    }
})