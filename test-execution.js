
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
const dotenv = require('dotenv'); // Import dotenv

dotenv.config(); // Load environment variables from .env file

const Networks = require('stellar-sdk').Networks;

const { buildStellarNetworkAdapter } = require('./stellar/stellar-network-adapter');

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
        console.debug(await stellarNetAdapter.createAccount(secretKey, '1000'));
        console.debug(await stellarNetAdapter.transfer(secretKey, 'GC33G756LXJ6HCJJ5TT4O73AZYLOVTCTMZB4QKWGXCSZOBMTK7XTNUNW', '150'));
    } catch (err) {
        logger.error(err);
    }
})();
