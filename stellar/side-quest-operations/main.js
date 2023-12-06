const stellarSdk = require('stellar-sdk');
const log4js = require('log4js');
const { fundUsingFriendbot } = require('../funder');

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
    Server,
    Networks,
    BASE_FEE,
    Asset,
    TransactionBuilder,
    Operation
} = stellarSdk;

module.exports.buildSideQuestsAdapter = (serverURL, networkPassphrase) => {
    if (!serverURL) {
        throw new Error('serverURL is required');
    }
    if (!networkPassphrase || networkPassphrase.length === 0) {
        networkPassphrase = Networks.TESTNET;
    }

    const server = new Server(serverURL);

    const feeBump = async (questKeypair, senderKeypair, destinationKeypair) => {
        const senderAccount = await server.loadAccount(senderKeypair.publicKey());
        
        let innerTransaction = new TransactionBuilder(
            senderAccount, {
              fee: BASE_FEE,
              networkPassphrase,
            })
            .addOperation(Operation.payment({
              destination: destinationKeypair.publicKey(),
              asset: Asset.native(),
              amount: "100",
              source: senderKeypair.publicKey(),
            }))
            .setTimeout(30)
            .build();

        innerTransaction.sign(senderKeypair);

        let feeBumpTransaction = new TransactionBuilder
            .buildFeeBumpTransaction(
                questKeypair,
                BASE_FEE,
                innerTransaction,
                networkPassphrase,
            );

        feeBumpTransaction.sign(questKeypair);

        const res = await server.submitTransaction(feeBumpTransaction);

        return {
            transactionHash: res.hash,
        };
    };

    return {
        feeBump,
    };
}
