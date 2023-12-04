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

const logger = log4js.getLogger();

const { 
  stellarNetAdapter, 
  assetsStellarAdapter, 
  stellarSetOptionsAdapter, 
  stellarConfigurationAdapterm, 
  advancedOperationsAdapter } = require('./setup');
const { fundUsingFriendbot } = require('../stellar/funder');
const { Keypair } = require('stellar-sdk');

const secretKey = process.env.SECRET_KEY;

// playground to test the functions
(async () => {
    try {
        // let generatedPubKey = process.env.RECEIVER_PUB_KEY;
        // if (!generatedPubKey) {
        //     const res = await stellarNetAdapter.createAccount(secretKey, '1000');
        //     generatedPubKey = res.newAccountPubKey;
        // }
        // console.debug(await stellarNetAdapter.transfer(secretKey, receiverPubKey, '10'));
        // console.debug(await stellarNetAdapter.changeTrust(secretKey, generatedPubKey, 'SANTA', '100'));
        // console.debug(await assetsStellarAdapter.createPassiveSellOffer(secretKey, '0.1', '700'));
        // console.debug(await assetsStellarAdapter.createBuyOffer(secretKey, '0.1', '100'));
        // await assetsStellarAdapter.pathPayments(secretKey);

        let questKeypair = Keypair.fromSecret(secretKey);
        let receiverKeypair = Keypair.random();

        // console.log(`Claimant Public Key: ${claimantKeypair.publicKey()}`);
        // console.log(`Claimant Secret Key: ${claimantKeypair.secret()}`);

        await fundUsingFriendbot([questKeypair.publicKey(), receiverKeypair.publicKey()]);

        // const res = await advancedOperationsAdapter.execTransactionClaimableBalance(questKeypair, claimantKeypair);

        const res = await advancedOperationsAdapter.liquidityPools(questKeypair, receiverKeypair);

        console.log(res);
    } catch (err) {
        logger.error(err);
        logger.error(err.response.data.extras);
    }
})();