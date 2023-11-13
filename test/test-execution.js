
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
const dotenv = require('dotenv');

dotenv.config();

const Networks = require('stellar-sdk').Networks;

const { buildStellarNetworkAdapter } = require('../stellar/payment-stellar-network-adapter');

const secretKey = process.env.SECRET_KEY;
const stellarNetwork = process.env.STELLAR_NETWORK;

const getNetwork = (stellarNetwork) => {
    if (stellarNetwork === 'PUBLIC') return 'https://horizon.stellar.org';
    return 'https://horizon-testnet.stellar.org';
};

const stellarNetAdapter = buildStellarNetworkAdapter(
    getNetwork(stellarNetwork), 
    stellarNetwork === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET,
    secretKey);

(async () => {
    try {
        let generatedPubKey = process.env.RECEIVER_PUB_KEY;
        if (!generatedPubKey) {
            const res = await stellarNetAdapter.createAccount(secretKey, '1000');
            generatedPubKey = res.newAccountPubKey;
        }
        // console.debug(await stellarNetAdapter.transfer(secretKey, receiverPubKey, '10'));
        console.debug(await stellarNetAdapter.changeTrust(secretKey, generatedPubKey, 'SANTA', '100'));
    } catch (err) {
        logger.error(err);
    }
})();
