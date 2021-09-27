const DynamoService = require('../lib/DynamoService');
const Api = require('../lib/api');

module.exports = class Bot {
    static hook(req, res) {
        // se for uma mensagem de zengoldabil
        if(req.body.message && req.body.message.text == '/zengoldabil') {
            var payload = Object.assign({}, req.body.message.chat);
            payload.id = payload.id.toString();
            payload.createdAt = (new Date()).toISOString();
            DynamoService.insert(payload)
            .then(function(result) {
                Bot.sendBroadCastMessage(`Novo subscrito no canal de notificações: ${req.body.message.chat.first_name}`)
                .then(function() {
                    res.status(200).send({});
                })
                .catch(function() {
                    res.status(200).send({});
                });
            })
            .catch(function(err) {
                console.log('ERROR RETURNED', err);
                res.status(200).send({});
            });
        } else {
            Bot.sendBroadCastMessage('Olá, você já está ativo nas nossas notificações.')
            .then(function() {
                res.status(200).send({});
            })
            .catch(function() {
                res.status(200).send({});
            });
        }
    }

    static notify(req, res) {
        if(req.headers.token == process.env.API_TOKEN) {
            Bot.sendBroadCastMessage(req.body.message)
            .then(function() {
                res.status(200).send({});
            })
            .catch(function() {
                res.status(200).send({});
            });
        } else {
            res.status(200).send({});
        }
    }

    static sendBroadCastMessage(message) {
        return new Promise(function(resolve, reject) {
            DynamoService.getChats()
            .then(function(chats) {
                console.log('CHATS encontrados: ', chats, chats.itens, typeof chats, typeof chats.itens);
                if(chats.total) {
                    var promisses = [];
                    for(var i =0; i < chats.total; i++) {
                        if(['appstatus', 'fiscalstatus', 'deliverystatus', 'healthcheckstock'].indexOf(chats.itens[i].id) === -1) {
                            promisses.push(
                                Api.postByBody(
                                process.env.TELEGRAM_URI,
                                '/sendMessage',
                                {
                                    chat_id: chats.itens[i].id,
                                    text: message
                                })
                            );
                        }
                    }
                    Promise.all(promisses)
                    .then(function() {
                        resolve(true);
                    })
                    .catch(function() {
                        reject(false);
                    });
                }
            })
            .catch(function(err) {
                console.log('ERROR RETURNED', err);
                reject(err);
            });
        });
    }
}