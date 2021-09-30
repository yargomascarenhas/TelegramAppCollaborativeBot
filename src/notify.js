const Collaborative = require('../lib/collaborative');
const Bot = require('./bot');

module.exports = class Notify {
    static send(req, res) {
        let text = Notify.textByNotification(req.body);
        Collaborative.query(Notify.queryRecipientsByNotification(req.body))
        .then(result => {
            if(result.data && result.data[0]) {
                let promises = [];
                for(let recipient of result.data) {
                    promises.push(Bot.sendMessage(
                        recipient.telegram_id,
                        text
                    ));
                }
                Promise.all(promises)
                .then(s => res.status(200).send({}))
                .catch(e => console.log(e));
            }
        });
    }

    static queryRecipientsByNotification(notification) {
        let query = '?';
        if (notification.to_type) {
            query += `type=${notification.to_type}`;
        }
        if (notification.to_environment) {
            query += `environment=${notification.to_environment}`;
        }
        if (notification.to_user) {
            query += `user_id=${notification.to_user}`;
        }
        return query;
    }

    static textByNotification(notification) {
        let text = '';
        if (notification.title) {
            text += notification.title;
        }
        if (notification.text) {
            var htmlString= notification.text;
            var stripedHtml = htmlString.replace(/<[^>]+>/g, ' ');
            text += stripedHtml;
        }
        return text;
    }
}