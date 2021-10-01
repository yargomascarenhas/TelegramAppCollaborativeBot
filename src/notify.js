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
                    promises.push(Bot.sendMessageMarkdown(
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