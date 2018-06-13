require('dotenv').config()
const debug = require('debug')('app')
const TeleBot = require('telebot');
const mongoose = require('mongoose');
const Person = require('./models/Person');
const List = require('./models/List');
 
mongoose.connect(process.env.MONGO_URL);

// Person.create({
//     name: 'andrew',
//     creator: '123'
// }, (err, doc) => {
//     console.log(err, doc);
// })




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

bot.on('/lists', (msg) => {
    Person.find({}, (err, persons) => {
        let message = persons
            .map(person => person.name)
            .join("\n")

        bot.sendMessage(msg.from.id, message);
    })
});

bot.start();