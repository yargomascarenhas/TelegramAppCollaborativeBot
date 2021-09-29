const Collaborative = require('../lib/collaborative');
const Api = require('../lib/api');

module.exports = class Bot {
    static hook(req, res) {
        if(Bot.haveMessageText(req)) {
            if(Bot.isAKey(req))
                Bot.processKey(req, res);
            else
                Bot.verifyIdentity(req, res);
        } else {
            res.status(200).send({});
        }
    }

    static sendMessage(chat_id, message) {
        return new Promise(function(resolve, reject) {
            Api.postByBody(
                process.env.TELEGRAMBOT_URI,
                '/sendMessage',
            {
                chat_id: chat_id,
                text: message
            })
            .then(function(result) {
                resolve(result);
            })
            .catch(function(error) {
                reject(error);
            });
        });
    }

    static isAKey(req) {
        const messagetext = req.body.message.text;
        return (messagetext.toUpperCase().indexOf('DEF') !== -1
            || messagetext.toUpperCase().indexOf('PAR') !== -1);
    }

    static haveMessageText(req) {
        return (req.body.message && req.body.message.text);
    }

    static processKey(req, res) {
        var payload = Object.assign({}, req.body.message);
        Collaborative.insert(payload)
        .then(function(datares) {
            if(datares.data && datares.data.id) {
                Bot.sendRegisterMessage(datares.data)
                .then(function() {res.status(200).send({})})
                .catch(function() {res.status(200).send({})});
            } else {
                Bot.sendInvalidKeyMessage(req.body.message.chat.id)
                .then(function() {res.status(200).send({})})
                .catch(function() {res.status(200).send({})});
            }
        })
        .catch(function(err) {
            Bot.sendServerFailMessage(req)
            .then(function() {res.status(200).send({})})
            .catch(function() {res.status(200).send({})});
        });
    }

    static sendRegisterMessage(data) {
        return Bot.sendMessage(
            data.telegram_id,
            `Tudo certo ${data.data.first_name}. Agora você está inscrito para as notificações da loja ${data.environment.name}!`
        );
    }

    static sendInvalidKeyMessage(chat_id) {
        return Bot.sendMessage(
            chat_id,
            `Hmmm... esse código que você informou é inválido`
        );
    }

    static sendServerFailMessage(req) {
        return Bot.sendMessage(
            req.body.message.chat.id,
            'Olha, eu estou um pouco atarefada por agora, fala comigo daqui a 1 minuto que te ajudo.'
        );
    }

    static verifyIdentity(req, res) {
        Collaborative.getUserByChatId(req.body.message.chat.id)
        .then(function(datares) {
            if(datares.data && datares.data.id) {
                Bot.sendMessage(
                    req.body.message.chat.id,
                    `Olá ${datares.data.data.first_name}, tudo bem?`
                ).then(function(result) {
                    console.log('DEU BOM');
                    console.log(result);
                    res.status(200).send({});
                })
                .catch(function(err) {
                    console.log('DEU RUIM');
                    console.log(err);
                });
            } else {
                Bot.sendMessage(
                    req.body.message.chat.id,
                    'Olá, eu ainda não te conheço, por favor digite a sua chave do AppCollaborative.'
                ).then(function(result) {
                    console.log('DEU BOM');
                    console.log(result);
                    res.status(200).send({});
                })
                .catch(function(err) {
                    console.log('DEU RUIM');
                    console.log(err);
                })
            }
        })
        .catch(function(err) {
            sendServerFailMessage(req)
            .then(function(result) {res.status(200).send({})})
            .catch(function(result) {res.status(200).send({})});
        });
    }
}