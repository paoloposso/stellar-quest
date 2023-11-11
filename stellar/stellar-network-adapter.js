const stellarSdk = require('stellar-sdk');
const logger = require('log4js').getLogger();

const {
    Keypair,
    Server,
    TransactionBuilder,
    Networks,
    Operation,
    BASE_FEE,
    Asset
} = stellarSdk;

/**
 * 
 * @param {string} serverURL 
 * @param {Networks} networkPassphrase 
 * @param {string} signerSecretKey
 * @returns {{createAccount: (signerSecretKey: string, startingBalance: string) => Promise<{transactionHash: string, newAccountPubKey: string}>, transfer: (originSecretKey: string, destinationPubKey: string, amount: string) => Promise<{transactionHash: string, origin: string, destination: string}>}}
 */
module.exports.buildStellarNetworkAdapter = (serverURL, networkPassphrase) => {
    if (!serverURL) {
        throw new Error('serverURL is required');
    }
    if (!networkPassphrase || networkPassphrase.length === 0) {
        networkPassphrase = Networks.TESTNET;
    }

    const server = new Server(serverURL);

    /**
     * 
     * @param {string} signerSecretKey 
     * @param {string} startingBalance 
     * @returns {{transactionHash: string, newAccountPubKey: string}}}
     */
    const createAccount = async (signerSecretKey, startingBalance) => {
        if (!signerSecretKey) {
            throw new Error('secretKey is required');
        }

        const newKeypair = Keypair.random();
        const signerKeyPair = Keypair.fromSecret(signerSecretKey);
    
        const questAccount = await server.loadAccount(signerKeyPair.publicKey());
    
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
    
        transaction.sign(signerKeyPair);
    
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

    const transfer = async (originSecretKey, destinationPubKey, amount) => {
        const originKeyPair = Keypair.fromSecret(originSecretKey);

        const originAccount = await server.loadAccount(originKeyPair.publicKey())

        const transaction = new TransactionBuilder(
            originAccount, {
              fee: BASE_FEE,
              networkPassphrase: networkPassphrase
            })
            .addOperation(Operation.payment({
              destination: destinationPubKey,
              asset: Asset.native(),
              amount: amount
            }))
            .setTimeout(30)
            .build();
        
        transaction.sign(originKeyPair);

        let res = await server.submitTransaction(transaction);

        return {
            transactionHash: res.hash,
            origin: originKeyPair.publicKey(),
            destination: destinationPubKey
        };
    }
    
    return {
        createAccount,
        transfer
    };
};
