
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

const { buildStellarNetworkAdapter } = require('../stellar/stellar-network-adapter');

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
        const receiverPubKey = process.env.RECEIVER_PUB_KEY;
        if (!receiverPubKey) {
            const res = await stellarNetAdapter.createAccount(secretKey, '10000');
            receiverPubKey = res.newAccountPubKey;
        }
        console.debug(await stellarNetAdapter.transfer(secretKey, receiverPubKey, '150'));
    } catch (err) {
        logger.error(err);
    }
})();
