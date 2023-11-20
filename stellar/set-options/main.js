const stellarSdk = require('stellar-sdk');
const log4js = require('log4js');

log4js.configure({
    appenders: {
      console: { type: 'console' }, // Log to the console
      file: { type: 'file', filename: 'app.log' }, // Log to a file
    },
    categories: {
      default: { appenders: ['console'], level: 'info' }, // Set the default log level to 'info'
    },
});

const {
    Keypair,
    Server,
    TransactionBuilder,
    Networks,
    Operation,
    BASE_FEE,
    Asset
} = stellarSdk;

module.exports.buildOptionsAdapter = (serverURL, networkPassphrase, homeDomain) => {
    if (!serverURL) {
        throw new Error('serverURL is required');
    }
    if (!networkPassphrase || networkPassphrase.length === 0) {
        networkPassphrase = Networks.TESTNET;
    }
    if (!homeDomain) {
        throw new Error('homeDomain is required');
    }

    const server = new Server(serverURL);

    const setOptions = async (sourceSecret) => {
        const questKeypair = Keypair.fromSecret(sourceSecret);

        const questAccount = await server.loadAccount(questKeypair.publicKey());

        const transaction = new TransactionBuilder(
            questAccount, {
              fee: BASE_FEE,
              networkPassphrase: Networks.TESTNET
            })
            .addOperation(Operation.setOptions({
              homeDomain: homeDomain
            }))
            .setTimeout(30)
            .build();
        
        transaction.sign(questKeypair);

        const res = await server.submitTransaction(transaction);

        return {
            transactionHash: res.hash
        };
    };

    return {
        setOptions,
    };
}