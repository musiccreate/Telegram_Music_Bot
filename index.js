const TelegramBot = require('node-telegram-bot-api');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const lyricsFinder = require('lyrics-finder');
const { BOT_TOKEN } = require('./config');

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// user data store
let userData = {};

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "🎧 VK Music Bot\nSend song name...");
});

// SEARCH
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith("/")) return;

    bot.sendMessage(chatId, "🔍 Searching...");

    try {
        let res = await yts(text);
        let videos = res.videos.slice(0, 10);

        userData[chatId] = {
            list: videos,
            index: 0
        };

        showList(chatId);

    } catch (err) {
        bot.sendMessage(chatId, "❌ Search error");
    }
});

// SHOW LIST
function showList(chatId) {
    let data = userData[chatId];
    let buttons = data.list.map((v, i) => [{
        text: `${i + 1}. ${v.title.substring(0, 35)}`,
        callback_data: `play_${i}`
    }]);

    bot.sendMessage(chatId, "🎵 Select a track:", {
        reply_markup: {
            inline_keyboard: buttons
        }
    });
}

// PLAY SONG
bot.on('callback_query', async (q) => {
    const chatId = q.message.chat.id;
    const data = q.data;

    if (data.startsWith("play_")) {
        let index = parseInt(data.split("_")[1]);
        userData[chatId].index = index;

        playSong(chatId);
    }

    if (data === "next") {
        userData[chatId].index++;
        playSong(chatId);
    }

    if (data === "back") {
        userData[chatId].index--;
        playSong(chatId);
    }

    if (data === "lyrics") {
        sendLyrics(chatId);
    }
});

// PLAY FUNCTION
async function playSong(chatId) {
    let data = userData[chatId];
    let video = data.list[data.index];

    if (!video) return;

    bot.sendMessage(chatId, `🎧 Playing\n${video.title}`);

    try {
        let stream = ytdl(video.url, { filter: 'audioonly' });

        bot.sendAudio(chatId, stream, {
            title: video.title,
            performer: video.author.name
        }, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "⏮ Back", callback_data: "back" },
                        { text: "⏭ Next", callback_data: "next" }
                    ],
                    [
                        { text: "📜 Lyrics", callback_data: "lyrics" }
                    ]
                ]
            }
        });

    } catch (err) {
        bot.sendMessage(chatId, "❌ Play error");
    }
}

// LYRICS
async function sendLyrics(chatId) {
    let data = userData[chatId];
    let video = data.list[data.index];

    try {
        let lyrics = await lyricsFinder("", video.title);

        if (!lyrics) lyrics = "❌ No lyrics found";

        bot.sendMessage(chatId, lyrics.substring(0, 4000));

    } catch (err) {
        bot.sendMessage(chatId, "❌ Lyrics error");
    }
}
