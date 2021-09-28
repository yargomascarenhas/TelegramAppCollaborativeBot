const Collaborative = require('../lib/collaborative');
const Api = require('../lib/api');

module.exports = class Bot {
    static hook(req, res) {
        if(req.body.message && req.body.message.text) {
            const messagetext = req.body.message.text;
            if(messagetext.toUpperCase().indexOf('DEF') !== -1 || messagetext.toUpperCase().indexOf('PAR') !== -1) {
                var payload = Object.assign({}, req.body.message.chat);
                payload.id = payload.id.toString();
                Collaborative.insert(payload)
                .then(function(result) {
                    console.log(result);
                    res.status(200).send({});
                    // Bot.sendBroadCastMessage(`Novo subscrito no canal de notificações: ${req.body.message.chat.first_name}`)
                    // .then(function() {
                    //     res.status(200).send({});
                    // })
                    // .catch(function() {
                    //     res.status(200).send({});
                    // });
                })
                .catch(function(err) {
                    console.log('ERROR RETURNED', err);
                    res.status(200).send({});
                });
            } else {
                Api.postByBody(
                process.env.TELEGRAMBOT_URI,
                '/sendMessage',
                {
                    chat_id: req.body.message.chat.id,
                    text: 'Olá, eu ainda não te conheço, por favor digite a sua chave do AppCollaborative.'
                });
            }
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
                                process.env.TELEGRAMBOT_URI,
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