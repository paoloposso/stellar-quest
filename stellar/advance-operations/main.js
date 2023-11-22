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
    Server,
    TransactionBuilder,
    Networks,
    Operation,
    BASE_FEE,
    Account
} = stellarSdk;

module.exports.buildAdvanceOpAdapter = (serverURL, networkPassphrase) => {
  if (!serverURL) {
    throw new Error('serverURL is required');
  }
  if (!networkPassphrase || networkPassphrase.length === 0) {
      networkPassphrase = Networks.TESTNET;
  }

  const server = new Server(serverURL);

  const bumpSequence = async (questKeypair) => {
    const questAccount = await server.loadAccount(questKeypair.publicKey());

    const transaction = new TransactionBuilder(
      questAccount, {
        fee: BASE_FEE,
        networkPassphrase: networkPassphrase
      })
      .addOperation(Operation.bumpSequence({
        bumpTo: (parseInt(questAccount.sequence) + 100).toString()
      }))
      .setTimeout(30)
      .build();
    
    transaction.sign(questKeypair);

    _ = await server.submitTransaction(transaction);

    const bumpedAccount = new Account(
      questKeypair.publicKey(),
      (parseInt(questAccount.sequence) + 99).toString()
    );

    const nextTransaction = new TransactionBuilder(
      bumpedAccount, {
        fee: BASE_FEE,
        networkPassphrase: networkPassphrase
      })
      .addOperation(Operation.manageData({
        name: 'sequence',
        value: 'bumped'
      }))
      .setTimeout(30)
      .build();    

    nextTransaction.sign(questKeypair);

    const res = await server.submitTransaction(nextTransaction);

    return {
        transactionHash: res.hash
    };
  };

  return {
    bumpSequence
  };
}