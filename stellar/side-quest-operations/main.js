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
    Operation,
    Keypair,
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

    const mintNft = async (receiverKeypair, metadataCID) => {
        const account = await server.loadAccount('GBCJNIQDK2PAETZRLRSGMOHBO43H6WLOSZNTGPNTWXGQYB5YQPI26QOK');

        const issuerKeypair = Keypair.fromSecret('SCNUV5JLGWUIWAO7MLW4L7PMWLTC5N3G6ZML2FHAUCHPSAYEHJZLPQAD');
        const nftAsset = new Asset('PIZZAASSET', issuerKeypair.publicKey());

        let transaction = new TransactionBuilder(
            account, {
              fee: BASE_FEE,
              networkPassphrase
            })
            // Add the NFT metadata to the issuer account using a `manageData` operation.
            .addOperation(Operation.manageData({
              name: 'ipfshash',
              value: metadataCID,
              source: issuerKeypair.publicKey(),
            }))
            .addOperation(Operation.changeTrust({
                asset: nftAsset,
                limit: '0.0000001',
                source: receiverKeypair.publicKey(),
              }))
            .addOperation(Operation.payment({
                destination: receiverKeypair.publicKey(),
                asset: nftAsset,
                amount: "0.0000001",
                source: issuerKeypair.publicKey(),
              }))
            .setTimeout(30)
            .build();

        transaction.sign(issuerKeypair, receiverKeypair);

        const res = await server.submitTransaction(transaction);

        return {
            transactionHash: res.hash,
        };
    };

    return {
        feeBump,
        mintNft,
    };
}
