const stellarSdk = require('stellar-sdk');
const logger = require('log4js').getLogger();

const {
    Keypair,
    Server,
    TransactionBuilder,
    Networks,
    Operation,
    BASE_FEE
} = stellarSdk;

/**
 * 
 * @param {string} serverURL 
 * @param {Networks} networkPassphrase 
 * @param {string} secretKey
 * @returns 
 */
module.exports.buildStellarNetworkAdapter = (serverURL, networkPassphrase, secretKey) => {
    if (!serverURL) {
        throw new Error('serverURL is required');
    }
    if (!secretKey) {
        throw new Error('secretKey is required');
    }
    if (!networkPassphrase || networkPassphrase.length === 0) {
        networkPassphrase = Networks.TESTNET;
    }

    const createAccount = async (startingBalance) => {
        const accountCreatorKeyPair = Keypair.fromSecret(secretKey);
        const newKeypair = Keypair.random();
    
        const server = new Server(serverURL);
        const questAccount = await server.loadAccount(accountCreatorKeyPair.publicKey());
    
        let transaction = new TransactionBuilder(
                    questAccount, {
                    fee: BASE_FEE,
                    networkPassphrase: networkPassphrase
                })
                .addOperation(Operation.createAccount({
                    destination: newKeypair.publicKey(),
                    startingBalance: startingBalance
                }))
                .setTimeout(30)
                .build();
    
        transaction.sign(accountCreatorKeyPair);
    
        logger.info(transaction.toXDR());
    
        try {
            let res = await server.submitTransaction(transaction);
            logger.info(`Transaction Successful! Hash: ${res.hash}`);
            return { 
                transactionHash: res.hash,
                newAccountPubKey: newKeypair.publicKey()
            };
        } catch (error) {
            logger.error(`${error}.`, `More details:\n${JSON.stringify(error.response.data.extras, null, 2)}`)
        }

        return null;
    }
    
    return {
        createAccount,
    };
};
