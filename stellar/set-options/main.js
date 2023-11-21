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

    /**
     * 
     * @param {stellarSdk.Keypair} questKeypair 
     * @param {stellarSdk.Keypair} issuerKeypair 
     * @returns 
     */
    const setFlagsAsset = async (questKeypair, issuerKeypair) => {
        const controlledAsset = new Asset(
            code = 'CONTROL',
            issuer = issuerKeypair.publicKey()
        )

        const questAccount = await server.loadAccount(questKeypair.publicKey());
        const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());

        let transaction = new TransactionBuilder(
            issuerAccount, {
                fee: BASE_FEE,
                networkPassphrase: Networks.TESTNET
            })
            .addOperation(Operation.setOptions({
                setFlags: 3
            }))
            .addOperation(Operation.changeTrust({
                asset: controlledAsset,
                source: questKeypair.publicKey()
            }))
            .setTimeout(30)
            .build();

        transaction.sign(issuerKeypair, questKeypair);

        _ = await server.submitTransaction(transaction);

        transaction = new TransactionBuilder(
            issuerAccount, {
                fee: BASE_FEE,
                networkPassphrase: Networks.TESTNET
            })
            .addOperation(Operation.setTrustLineFlags({
                trustor: questKeypair.publicKey(),
                asset: controlledAsset,
                flags: {
                    authorized: true
                }
            }))
             .addOperation(Operation.payment({
                destination: questKeypair.publicKey(),
                asset: controlledAsset,
                amount: '100'
            }))
            .setTimeout(30)
            .build();
        
        transaction.sign(issuerKeypair);

        _ = await server.submitTransaction(transaction);

        transaction = new TransactionBuilder(
            issuerAccount, {
                fee: BASE_FEE,
                networkPassphrase: Networks.TESTNET
            })
            .addOperation(Operation.setTrustLineFlags({
                trustor: questKeypair.publicKey(),
                asset: controlledAsset,
                flags: {
                    authorized: false
                }
            }))
            .setTimeout(30)
            .build();
        
        transaction.sign(issuerKeypair);

        const res = await server.submitTransaction(transaction);

        return {
            transactionHash: res.hash
        };
    };

    const setOptionsWeightThresholdSigners = async (questSecret, secondSecret, thirdSecret) => {
        const questKeypair = Keypair.fromSecret(questSecret);
        const secondSigner = Keypair.fromSecret(secondSecret);
        const thirdSigner = Keypair.fromSecret(thirdSecret);

        const questAccount = await server.loadAccount(questKeypair.publicKey());

        const transaction = new TransactionBuilder(
            questAccount, {
                fee: BASE_FEE,
                networkPassphrase,
            })
            .addOperation(Operation.setOptions({
                masterWeight: 1,
                lowThreshold: 5,
                medThreshold: 5,
                highThreshold: 5,
            }))
            .addOperation(Operation.setOptions({
                signer: {
                    ed25519PublicKey: secondSigner.publicKey(),
                    weight: 2
                }
            }))
            .addOperation(Operation.setOptions({
                signer: {
                    ed25519PublicKey: thirdSigner.publicKey(),
                    weight: 2
                }
                }))
            .setTimeout(30)
            .build();
        
        transaction.sign(questKeypair);

        const res = await server.submitTransaction(transaction);

        // example of transfer transaction to use the multi signature
        if (res.successful) {
            const transaction2 = new TransactionBuilder(
                questAccount, {
                    fee: BASE_FEE,
                    networkPassphrase,
                })
                .addOperation(Operation.payment({
                    destination: secondSigner.publicKey(),
                    asset: Asset.native(),
                    amount: '1000',
                }))
                .setTimeout(30)
                .build();
            
            transaction2.sign(questKeypair, secondSigner, thirdSigner);

            const res2 = await server.submitTransaction(transaction2);

            return {
                transactionHash: res2.hash
            };
        }

        return {
            transactionHash: res.hash
        };
    };

    return {
        setOptions,
        setOptionsWeightThresholdSigners,
        setFlagsAsset
    };
}