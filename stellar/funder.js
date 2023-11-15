const { StrKey } = require('stellar-sdk')

module.exports.fundUsingFriendbot = async (addresses) => {
    const addressArray = Array.isArray(addresses) ? [...addresses] : [addresses];
    await Promise.all(addressArray.map(async (pubkey) => {
      if (StrKey.isValidEd25519PublicKey(pubkey)) {
        const friendbotUrl = `https://friendbot.stellar.org?addr=${pubkey}`;
        await fetch(friendbotUrl);
      }
    }));
}