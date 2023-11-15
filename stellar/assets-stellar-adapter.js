const stellarSdk = require('stellar-sdk');
const log4js = require('log4js');
const { fundUsingFriendbot } = require('./funder');

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
                networkPassphrase: networkPassphrase
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

    const pathPayments = async (signerSecretKey) => {
        const questKeypair = Keypair.fromSecret(signerSecretKey);

        const questAccount = await server.loadAccount(questKeypair.publicKey());

        const issuerKeypair = Keypair.random();
        const distributorKeypair = Keypair.random();
        const destinationKeypair = Keypair.random();

        await fundUsingFriendbot([questKeypair.publicKey(), issuerKeypair.publicKey(), distributorKeypair.publicKey(), destinationKeypair.publicKey()]);
        
        const pathAsset = new Asset(
            code = 'PATH',
            issuer = issuerKeypair.publicKey()
        );          

        const transaction = new TransactionBuilder(
            questAccount, {
                fee: BASE_FEE,
                networkPassphrase: Networks.TESTNET
            })
            .addOperation(Operation.changeTrust({
                asset: pathAsset,
                source: destinationKeypair.publicKey()
            }))
            .addOperation(Operation.changeTrust({
                asset: pathAsset,
                source: distributorKeypair.publicKey()
            }))
            .addOperation(Operation.payment({
                destination: distributorKeypair.publicKey(),
                asset: pathAsset,
                amount: '100000',
                source: issuerKeypair.publicKey()
            }))
            .addOperation(Operation.createPassiveSellOffer({
                selling: pathAsset,
                buying: Asset.native(),
                amount: '2000',
                price: '1',
                source: distributorKeypair.publicKey()
            }))
            .addOperation(Operation.createPassiveSellOffer({
                selling: Asset.native(),
                buying: pathAsset,
                amount: '2000',
                price: '1',
                source: distributorKeypair.publicKey()
            }))
            .addOperation(Operation.pathPaymentStrictSend({
                sendAsset: Asset.native(),
                sendAmount: '1000',
                destination: destinationKeypair.publicKey(),
                destAsset: pathAsset,
                destMin: '1000'
              }))
            .setTimeout(30).build();
        
        transaction.sign(questKeypair,
            issuerKeypair,
            destinationKeypair,
            distributorKeypair
          );

        let res = await server.submitTransaction(transaction);

        return {
            transactionHash: res.hash
        };
    };

    return {
        createPassiveSellOffer,
        createBuyOffer,
        createSellOffer,
        pathPayments
    }
}