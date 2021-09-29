const { Router } = require('express');
const Bot = require('./src/bot');
const Check = require('./src/check');
const Notify = require('./src/notify');
const routes = Router();

routes.all('/bot', Bot.hook);
routes.get('/', Check.start);
routes.post('/notify', Notify.send);
module.exports = routes;