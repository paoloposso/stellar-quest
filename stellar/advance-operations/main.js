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
    Account,
    Claimant,
    Asset,
    LiquidityPoolAsset,
    getLiquidityPoolId
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

  const sponsorshipOperation = async (questKeypair, sponsorKeypair) => {
    // const questAccount = await server.loadAccount(questKeypair.publicKey());
    const sponsorAccount = await server.loadAccount(sponsorKeypair.publicKey());

    const transaction = new TransactionBuilder(
      sponsorAccount, {
        fee: BASE_FEE,
        networkPassphrase: networkPassphrase
      })
      .addOperation(Operation.beginSponsoringFutureReserves({
        sponsoredId: questKeypair.publicKey()
      }))
      .addOperation(Operation.createAccount({
        destination: questKeypair.publicKey(),
        startingBalance: '0'
      }))
      .addOperation(Operation.endSponsoringFutureReserves({
        source: questKeypair.publicKey()
      }))
      .setTimeout(30)
      .build();
    
    transaction.sign(questKeypair, sponsorKeypair);

    const res = await server.submitTransaction(transaction);

    return {
        transactionHash: res.hash
    };
  };

  const execTransactionClaimableBalance = async (questKeypair, claimantKeypair) => {
    // The `claimant` must wait at least 5 minutes before they can claim the balance.
    const claimant = new Claimant(
      claimantKeypair.publicKey(),
      Claimant.predicateNot(
        Claimant.predicateBeforeRelativeTime('300')
      )
    );

    // The `questClaimant` may claim the balance at any time (as long as it has not yet been claimed)
    const questClaimant = new Claimant(
      questKeypair.publicKey(),
      Claimant.predicateUnconditional()
    );

    const questAccount = await server.loadAccount(questKeypair.publicKey());

    const firstTransaction = new TransactionBuilder(
      questAccount, {
        fee: BASE_FEE,
        networkPassphrase,
      })
      .addOperation(Operation.createClaimableBalance({
        asset: Asset.native(),
        amount: '100',
        claimants: [
          claimant,
          questClaimant
        ]
      }))
      .setTimeout(30)
      .build();
    
    firstTransaction.sign(questKeypair);

    const res = await server.submitTransaction(firstTransaction);
    const claimableBalanceId = firstTransaction.getClaimableBalanceId(0);

    return {
      transactionHash: res.hash,
      claimableBalanceId
    };
  };

  const claimBalance = async (claimantKeypair, claimableBalanceId) => {
    const claimantAccount = await server.loadAccount(claimantKeypair.publicKey());
    const claimTransaction = new TransactionBuilder(
      claimantAccount, {
        fee: BASE_FEE,
        networkPassphrase,
      })
      .addOperation(Operation.claimClaimableBalance({
        balanceId: claimableBalanceId
      }))
      .setTimeout(30)
      .build();
    
    claimTransaction.sign(claimantKeypair);
    res = await server.submitTransaction(claimTransaction);

    return {
        transactionHash: res.hash
    };
  }

  const clawbackOperation = async (questKeypair, destinationKeypair) => {
    const questAccount = await server.loadAccount(questKeypair.publicKey());
    const setOptionsTransaction = new TransactionBuilder(
      questAccount, {
        fee: BASE_FEE,
        networkPassphrase,
      })
      .addOperation(Operation.setOptions({
        setFlags: 10
      }))
      .setTimeout(30)
      .build();
    
    setOptionsTransaction.sign(questKeypair);
    let transactionResponse = await server.submitTransaction(setOptionsTransaction);

    let result = [{
      operation: 'setOptions',
      transactionHash: transactionResponse.hash
    }];

    const clawbackAsset = new Asset(
      code = 'CLAWBACK',
      issuer = questKeypair.publicKey()
    )
    
    const paymentTransaction = new TransactionBuilder(
      questAccount, {
        fee: BASE_FEE,
        networkPassphrase
      })
      .addOperation(Operation.changeTrust({
        asset: clawbackAsset,
        source: destinationKeypair.publicKey()
      }))
      .addOperation(Operation.payment({
        destination: destinationKeypair.publicKey(),
        asset: clawbackAsset,
        amount: '500'
      }))
      .setTimeout(30)
      .build();
    
    paymentTransaction.sign(
      questKeypair,
      destinationKeypair
    )
    
    result.push({
      operation: 'payment',
      transactionHash: await server.submitTransaction(paymentTransaction).hash
    });

    const clawbackTransaction = new TransactionBuilder(
      questAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET
      })
      .addOperation(Operation.clawback({
        asset: clawbackAsset,
        amount: '250',
        from: destinationKeypair.publicKey()
      }))
      .setTimeout(30)
      .build();
      
    clawbackTransaction.sign(questKeypair);

    let r = await server.submitTransaction(clawbackTransaction);

    result.push(
      {
        operation: 'clawback',
        transactionHash: r.hash
      }
    );

    return result;
  }

  const liquidityPools = async (questKeypair, tradeKeypair) => {
    const result = [];

    const questAccount = await server.loadAccount(questKeypair.publicKey());
    const noodleAsset = new Asset(
      code = 'NOODLE',
      issuer = questKeypair.publicKey()
    )

    const lpAsset = new LiquidityPoolAsset(
      assetA = Asset.native(),
      assetB = noodleAsset,
      fee = 30
    )

    const liquidityPoolId = getLiquidityPoolId('constant_product', lpAsset).toString('hex');

    // const lpDepositTransaction = new TransactionBuilder(
    //   questAccount, {
    //     fee: BASE_FEE,
    //     networkPassphrase: Networks.TESTNET
    //   })
    //   .addOperation(Operation.changeTrust({
    //     asset: lpAsset
    //   }))
    //   .addOperation(Operation.liquidityPoolDeposit({
    //     liquidityPoolId: liquidityPoolId,
    //     maxAmountA: '100',
    //     maxAmountB: '100',
    //     minPrice: {
    //       n: 1,
    //       d: 1
    //     },
    //     maxPrice: {
    //       n: 1,
    //       d: 1
    //     }
    //   }))
    //   .setTimeout(30)
    //   .build();

    // lpDepositTransaction.sign(questKeypair);

    // let r = await server.submitTransaction(lpDepositTransaction);

    // result.push(
    //   {
    //     operation: 'lpDepositTransaction',
    //     transactionHash: r.hash
    //   }
    // );

    const tradeAccount = await server.loadAccount(tradeKeypair.publicKey());

    const pathPaymentTransaction = new TransactionBuilder(
      tradeAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET
      })
      .addOperation(Operation.changeTrust({
        asset: noodleAsset,
        source: tradeKeypair.publicKey()
      }))
      .addOperation(Operation.pathPaymentStrictReceive({
        sendAsset: Asset.native(),
        sendMax: '1000',
        destination: tradeKeypair.publicKey(),
        destAsset: noodleAsset,
        destAmount: '1',
        source: tradeKeypair.publicKey()
      }))
      .setTimeout(30)
      .build()
    
    pathPaymentTransaction.sign(tradeKeypair);
    
    res = await server.submitTransaction(pathPaymentTransaction)

    result.push(
      {
        operation: 'pathPaymentStrictReceive',
        transactionHash: res.hash
      }
    );

    const lpWithdrawTransaction = new TransactionBuilder(
      questAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET
      })
      .addOperation(Operation.liquidityPoolWithdraw({
        liquidityPoolId: liquidityPoolId,
        amount: '100',
        minAmountA: '0',
        minAmountB: '0'
      }))
      .setTimeout(30)
      .build();
    
    lpWithdrawTransaction.sign(questKeypair);
    
    res = await server.submitTransaction(lpWithdrawTransaction)

    result.push(
      {
        operation: 'liquidityPoolWithdraw',
        transactionHash: res.hash
      }
    );

    return result;
  }

  return {
    bumpSequence,
    sponsorshipOperation,
    execTransactionClaimableBalance,
    claimBalance,
    clawbackOperation,
    liquidityPools
  };
}