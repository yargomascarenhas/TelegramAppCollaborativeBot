const Collaborative = require('../lib/collaborative');
const Api = require('../lib/api');

module.exports = class Bot {
    static hook(req, res) {
        console.log('START');
        console.log(res.body);
        if(req.body.message && req.body.message.text) {
            const messagetext = req.body.message.text;
            console.log('TEXT');
            console.log(messagetext);
            if(messagetext.toUpperCase().indexOf('DEF') !== -1 || messagetext.toUpperCase().indexOf('PAR') !== -1) {
                console.log('ENTROU');
                var payload = Object.assign({}, req.body.message);
                Collaborative.insert(payload)
                .then(function(result) {
                    console.log(result, typeof result);
                    const datares = (typeof result == 'string') ? JSON.parse(result) : result;
                    if(datares.data && datares.data.id) {
                        Bot.sendMessage(
                            datares.data.telegram_id,
                            `Olá ${datares.data.data.first_name}, agora você está inscrito para as notificações da loja ${datares.data.environment.name}!`
                        ).then(function() {
                            res.status(200).send({});
                        });
                    }
                })
                .catch(function(err) {
                    console.log('ERROR RETURNED', err);
                    res.status(200).send({});
                });
            } else {
                console.log('ENVIOU MENSAGEM DE NAO SEI');
                //buscar pelo telegram id se o usuario existe.
                Bot.sendMessage(
                    req.body.message.chat.id,
                    'Olá, eu ainda não te conheço, por favor digite a sua chave do AppCollaborative.'
                ).then(function(result) {
                    res.status(200).send({});
                });
            }
        }
    }

    static sendMessage(chat_id, message) {
        return Api.postByBody(
        process.env.TELEGRAMBOT_URI,
        '/sendMessage',
        {
            chat_id: chat_id,
            text: message
        });
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