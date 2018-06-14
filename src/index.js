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
    usePlugins: ['askUser', 'namedButtons'], // Optional. Use user plugins from pluginFolder.
    pluginConfig: {
        namedButtons: {
            buttons: [
                { label: 'My lists', command: '/lists' },
                { label: 'Create list', command: '/list_create' },
                { label: 'Update list', command: '/list_update' },
                { label: 'Delete list', command: '/list_delete' }
            ]
        }
    }
});

bot.on('/start', (msg) => {
    return msg.reply.text('this is welcome message!');
});

bot.on('/help', (msg) => {
    let replyMarkup = bot.keyboard([
        ['My lists', 'Today to contact', 'My settings']
    ], {resize: true, once: true});

    const info = 'this is relationship helper for smart people that care.';

    return bot.sendMessage(msg.from.id, info, {replyMarkup});
});

bot.on('/lists', (msg) => {
    let replyMarkup = bot.keyboard([
        ['Create list', 'Update list', 'Delete list']
    ], {resize: true, once: true});

    List.find({}, (err, lists) => {
        let message = lists
            .map(list => list.title)
            .join("\n")

        bot.sendMessage(msg.from.id, message, { replyMarkup });
    })
});

bot.on('/list_create', (msg) => {
    return bot.sendMessage(msg.from.id, 'What is list name?', {ask: 'list-name'});
});

bot.on('ask.list-name', async msg => {
    const name = msg.text;

    let replyMarkup = bot.keyboard([
        ['My lists','Create list', 'Update list', 'Delete list']
    ], {resize: true, once: true});

    const list = new List({
        title: name,
        date: + new Date(),
        people: [],
        creator: msg.from.id
    })

    await list.save();

    return bot.sendMessage(msg.from.id, `Ok, ${ name } has been created.`, { replyMarkup });
});

bot.on('/list_delete', async msg => {
    const lists = await List.find({});

    let replyMarkup = bot.keyboard([
        lists
            .map(list => list.title)
            .map(list => `/list_delete_name ${list}`)
    ], {resize: true, once: true});

    return bot.sendMessage(msg.from.id, `Please, select list`, { replyMarkup });
});

bot.on('/list_delete_name', async msg => {

    const title = msg.text.match(/\/list_delete_name (.*)$/)[1];

    const list = await List.findOneAndRemove({title});

    let message = '';

    if(list) {
        message = 'List deleted'
    }else {
        message = 'Cannot find the list: '+ title;
    }

    // const lists = await List.find({});

    let replyMarkup = bot.keyboard([
        ['My lists','Create list', 'Update list', 'Delete list']
    ], {resize: true, once: true});

    return bot.sendMessage(msg.from.id, message, { replyMarkup });
});



bot.on('/debug', (msg) => {
    
});

bot.start();