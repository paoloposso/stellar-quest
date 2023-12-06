const dotenv = require('dotenv');

dotenv.config();

const Networks = require('stellar-sdk').Networks;

const { buildPaymentStellarAdapter: buildStellarNetworkAdapter } = require('../stellar/payment-stellar-adapter');
const { buildAssetsStellarAdapter } = require('../stellar/assets-stellar-adapter');
const { buildStellarConfigurationAdapter } = require('../stellar/configurations-operations/main');
const { buildOptionsAdapter } = require('../stellar/set-options/main');
const { buildAdvanceOpAdapter } = require('../stellar/advance-operations/main');
const { buildSideQuestsAdapter } = require('../stellar/side-quest-operations/main');

let stellarNetwork = '';

if (process.env.STELLAR_NETWORK === 'PUBLIC') {
    stellarNetwork = Networks.PUBLIC;
} else {
    stellarNetwork = Networks.TESTNET;
}

const homeDomain = process.env.HOME_DOMAIN;

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

const stellarConfigurationAdapter = buildStellarConfigurationAdapter(
    getNetwork(stellarNetwork), 
    stellarNetwork);

const stellarSetOptionsAdapter = buildOptionsAdapter(
    getNetwork(stellarNetwork), 
    stellarNetwork,
    homeDomain);

const advancedOperationsAdapter = buildAdvanceOpAdapter(
    getNetwork(stellarNetwork), 
    stellarNetwork);

const sideQuestsAdapter = buildSideQuestsAdapter(
    getNetwork(stellarNetwork), 
    stellarNetwork);

module.exports = { 
    stellarNetAdapter, 
    assetsStellarAdapter, 
    stellarConfigurationAdapter, 
    stellarSetOptionsAdapter, 
    advancedOperationsAdapter,
    sideQuestsAdapter
};