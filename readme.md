Create a .env file with the following variables:
```
SECRET_KEY=SA757C7U6MPXCGMRPIMYRLSIFBJ2ACYYPMDGIZL6NUSOH44LYMBJDZRD
STELLAR_NETWORK=TESTNET
```

set STELLAR_NETWORK to TESTNET or PUBLIC, depending on the netwrk you want to use.

Go to test-execution.js and use stellarNetAdapter to call the functions you want to execute.

Then

run `node index.js` to execute it.