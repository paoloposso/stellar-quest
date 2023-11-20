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

module.exports.buildStellarConfigurationAdapter = (serverURL, networkPassphrase) => {
    if (!serverURL) {
        throw new Error('serverURL is required');
    }
    if (!networkPassphrase || networkPassphrase.length === 0) {
        networkPassphrase = Networks.TESTNET;
    }

    const server = new Server(serverURL);

    const mergeAccounts = async (sourceSecret, destinationSecret) => {
        const questKeypair = Keypair.fromSecret(sourceSecret);
        const destinationKeypair = Keypair.fromSecret(destinationSecret);

        const questAccount = await server.loadAccount(questKeypair.publicKey());

        const transaction = new TransactionBuilder(
            questAccount, {
              fee: BASE_FEE,
              networkPassphrase: Networks.TESTNET
            })
            .addOperation(Operation.accountMerge({
              destination: destinationKeypair.publicKey()
            }))
            .setTimeout(30)
            .build();
        transaction.sign(questKeypair);

        const res = await server.submitTransaction(transaction);

        return {
            transactionHash: res.hash
        };
    };

    /**
     * 
     * @param {string} signerSecret 
     * @param {any} data 
     * @returns 
     */
    const manageData = async (signerSecret, data) => {
        const questKeypair = Keypair.fromSecret(signerSecret);
        // const destinationKeypair = Keypair.fromSecret(destinationSecret);

        const questAccount = await server.loadAccount(questKeypair.publicKey())

        const transaction = new TransactionBuilder(
            questAccount, {
              fee: BASE_FEE,
              networkPassphrase: Networks.TESTNET
            })
            .addOperation(Operation.manageData({
              name: 'Hello',
              value: 'World'
            }))
            .addOperation(Operation.manageData({
              name: 'Hello',
              value: Buffer.from('Stellar Quest!')
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
        mergeAccounts,
        manageData,
    }
}