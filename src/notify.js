const Collaborative = require('../lib/collaborative');
const Bot = require('./bot');

module.exports = class Notify {
    static send(req, res) {
        return new Promise((resolve, reject) => {
            let text = Notify.textByNotification(req.body);
            console.log('NOTIFY', text);
            Collaborative.query(Notify.queryRecipientsByNotification(req.body))
            .then(result => {
                console.log('recipients', result.data);
                if(result.data && result.data[0]) {
                    let promises = [];
                    for(let recipient of result.data) {
                        if(Notify.userMayReceiveThisMessage(recipient.user, req.body)) {
                            promises.push(Bot.sendMessageMarkdown(
                                recipient.telegram_id,
                                text
                            ));
                        } else {
                            promises.push(new Promise((res) => res(true)));
                        }
                    }
                    Promise.all(promises)
                    .then(s => {
                        resolve(true);
                        res.status(200).send({});
                    })
                    .catch(e => {
                        console.log(e);
                        resolve(true);
                        res.status(200).send({});
                    });
                } else {
                    resolve(true);
                    res.status(200).send({});
                }
            })
            .catch(err => {
                console.log('ERR', err);
                resolve(true);
                res.status(200).send({});
            })
        });
    }

    static userMayReceiveThisMessage(user, notification) {
        let preferences = {
          SOLICITACAOFINALIZADA: false,
          ORDEMCOMPRA: false,
          ECOMMERCEPEDIDO: false,
          VENDAPAGA: false,
          EXTRATOFECHADO: false,
          ECOMMERCENOVOCLIENTE: false,
          ESTOQUEESGOTADO: false,
          ANIVERSARIANTE: false,
        }
        let setpref = [];

        if(user.preferences) {
          preferences = user.preferences;
        } else {
          if (user.type === 'USER') {
              setpref = ['SOLICITACAOFINALIZADA', 'ECOMMERCEPEDIDO', 'VENDAPAGA', 'ECOMMERCENOVOCLIENTE', 'ANIVERSARIANTE'];
          }
          if (user.type === 'PARTNER') {
              setpref = ['ORDEMCOMPRA', 'ESTOQUEESGOTADO', 'EXTRATOFECHADO'];
          }
          for(let rule of setpref) {
            preferences[rule] = true;
          }
        }
        return preferences[notification.rule];
    }

    static queryRecipientsByNotification(notification) {
        let prefix = '';
        let query = '';
        if (notification.to_type) {
            prefix = (prefix == '') ? '?' : '&';
            query += `${prefix}type=${notification.to_type}`;
        }
        if (notification.to_environment) {
            prefix = (prefix == '') ? '?' : '&';
            query += `${prefix}environment=${notification.to_environment}`;
        }
        if (notification.to_user) {
            prefix = (prefix == '') ? '?' : '&';
            query += `${prefix}user_id=${notification.to_user}`;
        }
        console.log('QUERYING', query);
        return query;
    }

    static textByNotification(notification) {
        let text = '';
        let link = '';
        let content = '';
        if (notification.title) {
            text += notification.title;
        }
        if (notification.text && notification.text.indexOf('href=') !== -1) {
            let paras = notification.text.split('<a');
            let parbs = paras[1].split('</a>');
            let parcs = parbs[0].split('>');
            content = parcs[1];
            let parts = notification.text.split('href=');
            let paramdirt = (parts[1].indexOf('"') !== -1) ? parts[1].split('"') : parts[1].split('\'');
            link = (paramdirt[1] !== '') ? ` [${content}](${paramdirt[1]}) ` : '';
        }
        if (notification.text) {
            let htmlString= notification.text;
            let stripedHtml = htmlString.replace(/<[^>]+>/g, ' ');
            text += ', ' + stripedHtml;
        }
        if (content !== '') {
            text = text.replace(content, '');
        }
        if (text.indexOf('-') !== -1) {
            text = text.replace(/-/g, '\\-');
        }
        if (text.indexOf('.') !== -1) {
            text = text.replace(/\./g, '\\.');
        }
        if (link !== '') {
            text += link;
        }
        return text;
    }
}