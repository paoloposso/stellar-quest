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
 * @returns {{createAccount: (signerSecretKey: string, startingBalance: string) => {transactionHash: string, newAccountPubKey: string}, transfer: (originSecretKey: string, destinationPubKey: string, amount: string) => {transactionHash: string, origin: string, destination: string}, changeTrust: (sourceSecretKey: string, issuerPubKey: string, assetCode: string, limit: string) => {transactionHash: string}}
 */
module.exports.buildPaymentStellarAdapter = (serverURL, networkPassphrase) => {
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
            throw new Error('signerSecretKey is required');
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
    
        let res = await server.submitTransaction(transaction);
        logger.info(`Transaction Successful! Hash: ${res.hash}`);
        return { 
            transactionHash: res.hash,
            newAccountPubKey: newKeypair.publicKey()
        };
    }

    /**
     * 
     * @param {string} originSecretKey 
     * @param {string} destinationPubKey 
     * @param {string} amount 
     * @returns 
     */
    const transfer = async (originSecretKey, destinationPubKey, amount) => {
        if (!originSecretKey || originSecretKey.length === 0) {
            throw new Error('originSecretKey is required');
        }
        if (!destinationPubKey || destinationPubKey.length === 0) {
            throw new Error('destinationPubKey is required');
        }
        if (!amount || amount.length === 0) {
            throw new Error('amount is required');
        }

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

    /**
     * 
     * @param {string} sourceSecretKey 
     * @param {string} issuerPubKey 
     * @param {string} assetCode 
     * @param {string} limit 
     * @returns 
     */
    const changeTrust = async (sourceSecretKey, issuerPubKey, assetCode, limit) => {
        if (!sourceSecretKey || sourceSecretKey.length === 0) {
            throw new Error('sourceSecretKey is required');
        }
        if (!issuerPubKey || issuerPubKey.length === 0) {
            throw new Error('issuerPubKey is required');
        }
        if (!limit || limit.length === 0) {
            throw new Error('limit is required');
        }

        const questKeypair = Keypair.fromSecret(sourceSecretKey);
        const questAccount = await server.loadAccount(questKeypair.publicKey())

        const santaAsset = new Asset(
            code = assetCode,
            issuer = issuerPubKey
        )

        const transaction = new TransactionBuilder(
            questAccount, {
              fee: BASE_FEE,
              networkPassphrase: networkPassphrase
            })
            .addOperation(Operation.changeTrust({
              asset: santaAsset,
              limit: limit,
              source: questKeypair.publicKey()
            }))
            .setTimeout(30)
            .build()     
        
        transaction.sign(questKeypair)

        let res = await server.submitTransaction(transaction);
        return {
            transactionHash: res.hash,
            issuer: issuerPubKey,
            source: questKeypair.publicKey()
        };
    }
    
    return {
        createAccount,
        transfer,
        changeTrust
    };
};
