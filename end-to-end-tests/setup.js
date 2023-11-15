const dotenv = require('dotenv');

dotenv.config();

const Networks = require('stellar-sdk').Networks;

const { buildPaymentStellarAdapter: buildStellarNetworkAdapter } = require('../stellar/payment-stellar-adapter');
const { buildAssetsStellarAdapter } = require('../stellar/assets-stellar-adapter');

let stellarNetwork = '';

if (process.env.STELLAR_NETWORK === 'PUBLIC') {
    stellarNetwork = Networks.PUBLIC;
} else {
    stellarNetwork = Networks.TESTNET;
}

const getNetwork = (stellarNetwork) => {
    if (stellarNetwork === Networks.PUBLIC) return 'https://horizon.stellar.org';
    return 'https://horizon-testnet.stellar.org';
};

const stellarNetAdapter = buildStellarNetworkAdapter(
    getNetwork(stellarNetwork), 
    stellarNetwork);

const assetsStellarAdapter = buildAssetsStellarAdapter(
        getNetwork(stellarNetwork), 
        stellarNetwork);

module.exports = { stellarNetAdapter, assetsStellarAdapter };