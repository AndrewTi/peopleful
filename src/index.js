require('dotenv').config()
const debug = require('debug')('app')
const TeleBot = require('telebot');

const bot = new TeleBot({
    token: process.env.TELEGRAM_TOKEN, // Required. Telegram Bot API token.
    usePlugins: ['askUser'], // Optional. Use user plugins from pluginFolder.
});

bot.on('/start', (msg) => {
    return msg.reply.text('this is welcome message!');
});

bot.on('/help', (msg) => {
    let replyMarkup = bot.keyboard([
        [bot.button('lists', 'My lists'), bot.button('today', 'Today to contact'), bot.button('settings', 'My settings')]
    ], {resize: true, once: true});

    const info = 'this is relationship helper for smart people that care.';

    return bot.sendMessage(msg.from.id, info, {replyMarkup});
});

bot.start();