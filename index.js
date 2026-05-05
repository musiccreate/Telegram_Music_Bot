const TelegramBot = require('node-telegram-bot-api');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const { BOT_TOKEN } = require('./config');

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Store search results
let userSearch = {};

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "🎵 Send me a song name!");
});

// Search song
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith("/")) return;

    bot.sendMessage(chatId, "🔍 Searching...");

    try {
        let search = await yts(text);
        let videos = search.videos.slice(0, 5);

        if (!videos.length) {
            return bot.sendMessage(chatId, "❌ No results found");
        }

        userSearch[chatId] = videos;

        let buttons = videos.map((v, i) => [{
            text: `${i + 1}. ${v.title.substring(0, 30)}`,
            callback_data: `play_${i}`
        }]);

        bot.sendMessage(chatId, "🎧 Choose a song:", {
            reply_markup: {
                inline_keyboard: buttons
            }
        });

    } catch (err) {
        console.log(err);
        bot.sendMessage(chatId, "❌ Error searching");
    }
});

// Play song
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (!data.startsWith("play_")) return;

    let index = data.split("_")[1];
    let video = userSearch[chatId][index];

    if (!video) {
        return bot.sendMessage(chatId, "❌ Song not found");
    }

    bot.sendMessage(chatId, `🎶 Playing: ${video.title}`);

    try {
        let stream = ytdl(video.url, { filter: 'audioonly' });

        bot.sendAudio(chatId, stream, {
            title: video.title,
            performer: video.author.name
        });

    } catch (err) {
        console.log(err);
        bot.sendMessage(chatId, "❌ Error playing song");
    }
});
