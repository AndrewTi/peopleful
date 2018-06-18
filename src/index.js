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
                { label: 'Delete list', command: '/list_delete' },
                { label: 'Rename list', command: '/list_rename' }, 
                { label: 'View persons', command: '/persons_view' }, 
                { label: 'Add person', command: '/person_add' },
                { label: 'Today to contact', command: '/today' }
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

bot.on('/today', async msg => {
    let replyMarkup = bot.keyboard([
        ['My lists', 'Today to contact', 'My settings']
    ], {resize: true, once: true});

    const person = await Person.findOne({
        creator: msg.from.id
    }, null, {sort: {'lastUsed': 1}});

    person.lastUsed = + new Date;
    await person.save();

    return bot.sendMessage(msg.from.id, `🖖 ${person.name}`, { replyMarkup });
});

bot.on('/lists', (msg) => {
    List.find({creator: msg.from.id}, (err, lists) => {
        if (err) {
            return bot.sendMessage(msg.from.id, 'Sorry, something went wrong.');
        }

        if (!lists.length) {
            let replyMarkup = bot.keyboard([
                ['Create list']
            ], {resize: true, once: true});

            return bot.sendMessage(msg.from.id, 'You have no lists', { replyMarkup });
        }

        let message = lists
            .map(list => `▪️ ${list.title} (${list.people.length} persons)`)
            .join("\n");

        let replyMarkup = bot.keyboard([
            ['My lists', 'Create list', 'Update list', 'Delete list']
        ], {resize: true, once: true});

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
    const lists = await List.find({creator: msg.from.id});

    let replyMarkup = bot.keyboard([
        lists
            .map(list => list.title)
            .map(list => `/list_delete_name ${list}`)
    ], {resize: true, once: true});

    return bot.sendMessage(msg.from.id, `Please, select list`, { replyMarkup });
});

bot.on('/list_delete_name', async msg => {
    const title = msg.text.match(/\/list_delete_name (.*)$/)[1];

    const list = await List.findOneAndRemove({title, creator: msg.from.id});

    let message = '';

    if(list) {
        message = 'List deleted'
    }else {
        message = 'Cannot find the list: '+ title;
    }

    // const lists = await List.find({});

    let replyMarkup = bot.keyboard([
        ['My lists', 'Create list', 'Update list', 'Delete list']
    ], {resize: true, once: true});

    return bot.sendMessage(msg.from.id, message, { replyMarkup });
});

bot.on('/list_update', async msg => {
    const lists = await List.find({creator: msg.from.id});

    let message = lists
        .map(list => `${list.title}, ${list.people.length} persons`)
        .join("\n");

    let replyMarkup = bot.keyboard([
        ['My lists', 'Rename list', 'View persons', 'Add person']
    ], {resize: true, once: true});

    return bot.sendMessage(msg.from.id, message, { replyMarkup });
});

bot.on('/list_rename', async msg => {
    const lists = await List.find({creator: msg.from.id});

    let replyMarkup = bot.keyboard([
        lists
            .map(list => list.title)
            .map(list => `/list_rename_name ${list}`)
    ], {resize: true, once: true});

    return bot.sendMessage(msg.from.id, `Please, select list to rename`, { replyMarkup });
})

bot.on('/list_rename_name', async msg => {
    const title = msg.text.match(/\/list_rename_name (.*)$/)[1];

    // @todo add validation if list exists
    return bot.sendMessage(msg.from.id, 'How would you like to rename the list "'+title+'"?', {ask: 'list-rename'});
})

bot.on('/persons_view', async msg => {
    const lists = await List.findOne({creator: msg.from.id}).populate('people');

    let message = lists.people
            .map(person => `${person.name}`)
            .join("\n");
    
    let replyMarkup = bot.keyboard([
        ['My lists', 'Add person', 'Remove person']
    ], {resize: true, once: true});

    return bot.sendMessage(msg.from.id, message, { replyMarkup });
});

bot.on('/person_add', async msg => {
    let listTitle;
    let personName;

    try {
        [a, listTitle, personName] = msg.text.match(/\/person_add "(.+?)" "(.+?)"$/);
    }
    catch (e) { }

    if (!listTitle || !personName) {
        return bot.sendMessage(msg.from.id, 'Please, type /person_add "<list-name>" "<person-name>".');
    }

    const list = await List.findOne({
        title: listTitle,
        creator: msg.from.id
    });

    if (!list) {
        return bot.sendMessage(msg.from.id, `List "${listTitle}" has not been found.`);
    }

    const person = new Person({
        name: personName,
        creator: msg.from.id
    })
    await person.save();

    list.people.push(person._id);
    await list.save();

    return bot.sendMessage(msg.from.id, `List "${listTitle}" has been updated. Use /lists to check your lists.`);
});


bot.on('/debug', (msg) => {
    
});

bot.start();