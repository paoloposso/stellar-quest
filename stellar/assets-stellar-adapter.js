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

const usdcAsset = new Asset(
    code = 'USDC',
    issuer = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
);

module.exports.buildAssetsStellarAdapter = (serverURL, networkPassphrase) => {
    if (!serverURL) {
        throw new Error('serverURL is required');
    }
    if (!networkPassphrase || networkPassphrase.length === 0) {
        networkPassphrase = Networks.TESTNET;
    }

    const server = new Server(serverURL);

    const createPassiveSellOffer = async (signerSecretKey, price, amount) => {
        const signerKeypair = Keypair.fromSecret(signerSecretKey);

        const questAccount = await server.loadAccount(signerKeypair.publicKey());

        const transaction = new TransactionBuilder(
            questAccount, {
                fee: BASE_FEE,
                networkPassphrase: Networks.TESTNET
            })
            .addOperation(Operation.changeTrust({
                asset: usdcAsset
            }))
            .addOperation(Operation.createPassiveSellOffer({
                selling: Asset.native(),
                buying: usdcAsset,
                amount,
                price,
                source: signerKeypair.publicKey()
            }))
            .setTimeout(30)
            .build();
        
        transaction.sign(signerKeypair);

        let res = await server.submitTransaction(transaction);

        return {
            transactionHash: res.hash
        };
    };

    const createBuyOffer = async (signerSecretKey, price, buyAmount, offerId) => {
        const signerKeypair = Keypair.fromSecret(signerSecretKey);

        const questAccount = await server.loadAccount(signerKeypair.publicKey());

        const transaction = new TransactionBuilder(
            questAccount, {
                fee: BASE_FEE,
                networkPassphrase: Networks.TESTNET
            })
            .addOperation(Operation.changeTrust({
                asset: usdcAsset
            }))
            .addOperation(Operation.manageBuyOffer({
                selling: Asset.native(),
                buying: usdcAsset,
                buyAmount,
                price,
                offerId: '0',
                source: signerKeypair.publicKey()
            }))
            .setTimeout(30)
            .build();
        
        transaction.sign(signerKeypair);

        let res = await server.submitTransaction(transaction);

        return {
            transactionHash: res.hash
        };
    };

    const createSellOffer = async (signerSecretKey, price, amount, offerId) => {
        const signerKeypair = Keypair.fromSecret(signerSecretKey);

        const questAccount = await server.loadAccount(signerKeypair.publicKey());

        const transaction = new TransactionBuilder(
            questAccount, {
                fee: BASE_FEE,
                networkPassphrase: Networks.TESTNET
            })
            .addOperation(Operation.changeTrust({
                asset: usdcAsset
            }))
            .addOperation(Operation.manageSellOffer({
                selling: Asset.native(),
                buying: usdcAsset,
                amount,
                price,
                offerId: '0',
                source: questKeypair.publicKey()
            }))
            .setTimeout(30)
            .build();
        
        transaction.sign(signerKeypair);

        let res = await server.submitTransaction(transaction);

        return {
            transactionHash: res.hash
        };
    };

    return {
        createPassiveSellOffer,
        createBuyOffer,
        createSellOffer
    }
}