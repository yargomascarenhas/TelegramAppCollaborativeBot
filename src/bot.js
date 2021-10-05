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

    static sendMessageMarkdown(chat_id, message) {
        return new Promise(function(resolve, reject) {
            console.log('STARTING sendMessageMarkdown');
            console.log(message);
            console.log(chat_id);
            Api.postByBody(
                process.env.TELEGRAMBOT_URI,
                '/sendMessage',
            {
                chat_id: chat_id,
                text: message,
                parse_mode: 'MarkdownV2',
                disable_web_page_preview: true
            })
            .then(function(result) {
                console.log('RESULT', result);
                resolve(result);
            })
            .catch(function(error) {
                console.log('ERROR', error);
                reject(error);
            });
        });
    }

    static isAKey(req) {
        const messagetext = req.body.message.text;
        return ((messagetext.toUpperCase().indexOf('DEF') !== -1
            || messagetext.toUpperCase().indexOf('PAR') !== -1)
            && messagetext.length === 11);
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
            } else if(datares.error && datares.error.message && datares.error.message == 'TELEGRAM_IN_USE_KEY') {
                Bot.sendMessage(req.body.message.chat.id,
                    'Sua conta telegram já está vinculada a uma chave, não é possível vincular uma nova chave a este telegram')
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
                Bot.processConversation(req, datares)
                .then(function() {res.status(200).send({})})
                .catch(function() {res.status(200).send({})});
            } else {
                Bot.sendMessage(
                    req.body.message.chat.id,
                    'Olá, eu ainda não te conheço, por favor digite a sua chave do AppCollaborative.'
                ).then(function() {res.status(200).send({})})
                .catch(function() {res.status(200).send({})});
            }
        })
        .catch(function(err) {
            console.log('ERR', err);
            Bot.sendServerFailMessage(req)
            .then(function(result) {res.status(200).send({})})
            .catch(function(result) {res.status(200).send({})});
        });
    }

    static msgContains(message, text) {
        return (message.toUpperCase().indexOf(text) !== -1);
    }

    static isDefault(datares) {
        console.log('ISDEFAULT, DATARES', datares);
        return datares.data.user.type === 'USER';
    }

    static isPartner(datares) {
        return datares.data.user.type === 'PARTNER';
    }

    static respostaDireta(messagetext) {
        console.log('respostaDireta');
        let response = '';
        if(Bot.msgContains(messagetext, 'OI')) {
            response = `Oi, como posso ajudar?`;
        }
        if(Bot.msgContains(messagetext, 'OLÁ') ||
            Bot.msgContains(messagetext, 'OLA')) {
            response = `Olá, como posso ajudar?`;
        }
        if(Bot.msgContains(messagetext, 'BOM DIA')) {
            response = `Bom dia, como posso ajudar?`;
        }
        if(Bot.msgContains(messagetext, 'BOA TARDE')) {
            response = `Boa tarde, como posso ajudar?`;
        }
        if(Bot.msgContains(messagetext, 'BOA NOITE')) {
            response = `Boa noite, como posso ajudar?`;
        }
        if(Bot.msgContains(messagetext, 'OBRIGAD')) {
            response = `Nada, eu que agradeço!`;
        }
        if((Bot.msgContains(messagetext, 'TUDO')
            && Bot.msgContains(messagetext, 'TD'))
            && (Bot.msgContains(messagetext, 'VC?')
            || Bot.msgContains(messagetext, 'VOCE?')
            || Bot.msgContains(messagetext, 'VOCÊ?')
            || Bot.msgContains(messagetext, 'TU?')
            || Bot.msgContains(messagetext, 'VAI?')
            || Bot.msgContains(messagetext, 'ESTA?')
            || Bot.msgContains(messagetext, 'CONTIGO?'))) {
            response = `Estou bem, obrigada por perguntar, como posso ajudar?`;
        }
        if((Bot.msgContains(messagetext, 'TUDO')
            && Bot.msgContains(messagetext, 'TD'))
            && !(Bot.msgContains(messagetext, 'VC?')
            || Bot.msgContains(messagetext, 'VOCE?')
            || Bot.msgContains(messagetext, 'VOCÊ?')
            || Bot.msgContains(messagetext, 'TU?')
            || Bot.msgContains(messagetext, 'VAI?')
            || Bot.msgContains(messagetext, 'ESTA?')
            || Bot.msgContains(messagetext, 'CONTIGO?'))) {
            response = `Posso ajudar de alguma forma?`;
        }
        return response;
    }

    static intencaoDuvida(datares, chat_id, messagetext) {
        console.log('intencaoDuvida');
        let response = '';

        if(Bot.isDefault(datares)) {
            console.log('isDefault: true');
            if(Bot.msgContains(messagetext, 'CHECKIN') ||
                Bot.msgContains(messagetext, 'CHECK-IN')) {
                if(Bot.msgContains(messagetext, 'FAZER') ||
                    Bot.msgContains(messagetext, 'EFETUAR') ||
                    Bot.msgContains(messagetext, 'FAÇO') ||
                    Bot.msgContains(messagetext, 'FAZ')) {
                    response = 'O parceiro faz o Check\\-in através do acesso dele na plataforma, e quando o check\\-in é finalizado ele fica disponível para você conferir os itens, aceitar ou negar\\. [Saiba mais](https://youtu.be/20Ff4DdA05U)';
                }
                if(Bot.msgContains(messagetext, 'ACEITAR') ||
                    Bot.msgContains(messagetext, 'ACEITA') ||
                    Bot.msgContains(messagetext, 'ACEITO') ||
                    Bot.msgContains(messagetext, 'NEGAR') ||
                    Bot.msgContains(messagetext, 'NEGO') ||
                    Bot.msgContains(messagetext, 'NEGA')) {
                    response = 'Você pode aceitar ou negar um Check\\-in, através do menu \\-> Parceiros \\-> Solicitações \\-> clique sobre o Check\\-in desejado\\. [Saiba mais](https://youtu.be/\\-mrOK7_Q8IQ)';
                }
                if(Bot.msgContains(messagetext, 'ETIQUETA')) {
                    response = 'Você pode imprimir etiquetas em qualquer tipo de impressora utilizando o AppCollaborative, lembre\\-se sempre de utilizar o Google Chrome, para mais detalhes preparamos esse video que ensina como configurar e imprimir: [Etiquetas](https://youtu.be/uBjCMwXFRJI)';
                }
            }
            if(Bot.msgContains(messagetext, 'CHECKOUT') ||
                Bot.msgContains(messagetext, 'CHECK-OUT')) {
                if(Bot.msgContains(messagetext, 'FAZER') ||
                    Bot.msgContains(messagetext, 'EFETUAR') ||
                    Bot.msgContains(messagetext, 'FAÇO') ||
                    Bot.msgContains(messagetext, 'FAZ')) {
                    response = 'O parceiro faz o Check\\-out através do acesso dele na plataforma, e quando o check\\-out é finalizado ele fica disponível para você conferir os itens, aceitar ou negar\\. [Saiba mais](https://youtu.be/3_9_ceZ5nWU)';
                }
                if(Bot.msgContains(messagetext, 'ACEITAR') ||
                    Bot.msgContains(messagetext, 'ACEITA') ||
                    Bot.msgContains(messagetext, 'ACEITO') ||
                    Bot.msgContains(messagetext, 'NEGAR') ||
                    Bot.msgContains(messagetext, 'NEGO') ||
                    Bot.msgContains(messagetext, 'NEGA')) {
                    response = 'Você pode aceitar ou negar um Check\\-out, através do menu \\-> Parceiros \\-> Solicitações \\-> clique sobre o Check\\-out desejado\\. [Saiba mais](https://youtu.be/3_9_ceZ5nWU)';
                }
            }
            if(Bot.msgContains(messagetext, 'ETIQUETA')) {
                response = 'Você pode imprimir etiquetas em qualquer tipo de impressora utilizando o AppCollaborative, lembre\\-se sempre de utilizar o Google Chrome, para mais detalhes preparamos esse video que ensina como configurar e imprimir: [Etiquetas](https://youtu.be/uBjCMwXFRJI)';
            }
            if(Bot.msgContains(messagetext, 'PRODUTO')) {
                console.log('CONTAINS: PRODUTO');
                if(Bot.msgContains(messagetext, 'CADASTRAR') ||
                    Bot.msgContains(messagetext, 'SALVAR') ||
                    Bot.msgContains(messagetext, 'EDITAR') ||
                    Bot.msgContains(messagetext, 'MUDAR')
                ) {
                    console.log('CONTAINS: CADASTRAR,SALVAR,EDITAR,MUDAR');
                    response = 'Você como lojista pode cadastrar um novo produto, editar e deletar direto no menu \\-> Produtos \\-> Produtos, a Marca somente consegue inserir e editar produtos através de solicitações';
                }
                if(Bot.msgContains(messagetext, 'DESCONTO')) {
                    response = 'Você pode cadastrar um desconto direto no produto e assim toda vez que ele for adicionado na venda ele já entrará com o valor do desconto, esse desconto também será exibido no e\\-commerce\\.';
                }
                if(Bot.msgContains(messagetext, 'CUSTO')) {
                    response = 'Tanto você quanto a marca podem cadastrar o preço de custo no produto, e depois apurar os produtos vendidos pelo preço de custo no relatório de vendas,  marcando a opção de visualização com preço de custo\\.';
                }
                if(Bot.msgContains(messagetext, 'MARKUP') ||
                    Bot.msgContains(messagetext, 'COMISSAO')) {
                    response = 'Por padrão o sistema considera o calculo de comissão com base na porcentagem informada no campo de markup no cadastro do Parceiro, você pode informar o markup em porcentagem de um produto específico, dessa forma o calculo será prioritariamente com base no cadastro do produto\\.';
                }
                if(Bot.msgContains(messagetext, 'FOTO')) {
                    response = 'Você pode cadastrar uma foto por produto, dependendo se a loja utiliza o nosso módulo de E\\-commerce e dependendo do tema é possível adicionar até três fotos por produto\\.';
                }
            }
            if(Bot.msgContains(messagetext, 'VENDA')) {
                if(Bot.msgContains(messagetext, 'FAZ') ||
                    Bot.msgContains(messagetext, 'CADASTRA') ||
                    Bot.msgContains(messagetext, 'EFETUA') ||
                    Bot.msgContains(messagetext, 'PAGA')) {
                    response = 'preparamos um vídeo que vai te ajudar a entender mais sobre as vendas, segue: [Video](https://youtu.be/PMYwO0bIwgk)';
                }
                if(Bot.msgContains(messagetext, 'APAGA') ||
                    Bot.msgContains(messagetext, 'DELETA')) {
                    response = 'preparamos um vídeo que mostra como deletar uma venda, segue: [Video](https://youtu.be/YRnrEKDAhtk)';
                }
            }
            if(Bot.msgContains(messagetext, 'EXTRATO') ||
                Bot.msgContains(messagetext, 'COMISSAO')) {
                response = 'preparamos um vídeo que vai te ajudar a entender como funciona as comissões e extratos no AppCollaborative, segue: [Video](https://youtu.be/EWLcnQnaQcc)';
            }
            if(Bot.msgContains(messagetext, 'TROCA') ||
                Bot.msgContains(messagetext, 'DEVOLUCAO') ||
                Bot.msgContains(messagetext, 'DEVOLVE')) {
                response = 'preparamos um vídeo que vai te ajudar a entender como funciona as trocas e devoluções, segue: [Video](https://youtu.be/YSgg6DY98N0)';
            }
            if(Bot.msgContains(messagetext, 'ECOMMERCE') ||
                Bot.msgContains(messagetext, 'E-COMMERCE') ||
                Bot.msgContains(messagetext, 'DELIVERY')) {
                //todo
            }
            if(Bot.msgContains(messagetext, 'FISCAL') ||
                Bot.msgContains(messagetext, 'NOTA') ||
                Bot.msgContains(messagetext, 'NF')) {

            }
            if(Bot.msgContains(messagetext, 'USUARIO') ||
                Bot.msgContains(messagetext, 'FUNCIONARIO') ||
                Bot.msgContains(messagetext, 'SOCIO') ||
                Bot.msgContains(messagetext, 'ADMINISTRADOR') ||
                Bot.msgContains(messagetext, 'VENDEDOR')) {

            }
            if(Bot.msgContains(messagetext, 'PARCEIRO') ||
                Bot.msgContains(messagetext, 'MARCA') ||
                Bot.msgContains(messagetext, 'ARTESÃO') ||
                Bot.msgContains(messagetext, 'COLABORADOR')) {

            }
        }
        if(Bot.isPartner(datares)) {

        }
        console.log('RESPONSE', response);
        return Bot.sendMessageMarkdown(
            chat_id,
            response
        );
    }

    static intencaoConsultaQuantidade(datares, chat_id, messagetext) {
        console.log('intencaoConsultaQuantidade');
        let response = 'não entendi, por favor reformule sua pergunta';
        return Bot.sendMessage(
            chat_id,
            response
        );
    }

    static intencaoConsultaIdentidade(datares, chat_id, messagetext) {
        console.log('intencaoConsultaIdentidade');
        let response = 'não entendi, por favor reformule sua pergunta';
        return Bot.sendMessage(
            chat_id,
            response
        );
    }

    static processConversation(req, datares) {
        const chat_id = req.body.message.chat.id;
        const messagetext = req.body.message.text;
        let response = '';
        console.log('processConversation');
        response = Bot.respostaDireta(messagetext);
        if(Bot.msgContains(messagetext, 'COMO')) {
            return Bot.intencaoDuvida(datares, chat_id, messagetext);
        }
        if(Bot.msgContains(messagetext, 'QUANTO')
            || Bot.msgContains(messagetext, 'QUANTOS')
            || Bot.msgContains(messagetext, 'QUANTAS')
            || Bot.msgContains(messagetext, 'QUANTA')) {
            return Bot.intencaoConsultaQuantidade(datares, chat_id, messagetext);
        }
        if(Bot.msgContains(messagetext, 'QUAL')
            || Bot.msgContains(messagetext, 'O QUE')) {
            return Bot.intencaoConsultaIdentidade(datares, chat_id, messagetext);
        }

        return Bot.sendMessage(
            chat_id,
            response
        );
    }
}