# Stellar Net Adapter Sandbox

Created to practice and follow the Stellar Quest avaibale in https://quest.stellar.org/
I'm creating adapter functions to use the Stellar SDK and make it easier to use with little configuration requirements.

## Test execution: End-to-end

Go to /test

Create a .env file with the following variables:
```
SECRET_KEY={SA757...}
STELLAR_NETWORK=TESTNET
```

Being the value in {SA757...} and existing secret key, previously created in the network you want to use.

Set STELLAR_NETWORK to TESTNET or PUBLIC, depending on the network you want to use. By default it's TESTNET.

Go to test-execution.js and use stellarNetAdapter to call the functions you want to execute.

Then

run `node test-execution.js` to execute it.

Change the values you want, like value, public key to receive funds, etc.

For instance, I'm creating a random account and funding it with 1000 XLMs. 
Then I'm transferring 150 XLMs to another account.

This following snippet comes from test-execution.js and shows these transactions.


```js
const receiverPubKey = process.env.RECEIVER_PUB_KEY;
if (!receiverPubKey) {
    const res = await stellarNetAdapter.createAccount(secretKey, '10000');
    receiverPubKey = res.newAccountPubKey;
}
```

You can, instead, use an existing pub key to receive this transfer:

Optionally, add RECEIVER_PUB_KEY to the file. 
If you don't, it will create this random account I meantioned and use it to receive the transfer.
