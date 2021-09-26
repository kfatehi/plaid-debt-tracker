create a json file for the debt like this:

debt.json

```json
{
    "matcher":"Zelle payment from Borrower",
    "startBalance": 36000,
    "startDate": "2021-06-01"
}
```

go through the plaid quickstart to get your plaid ids,
stick them in the config file:

config.js

```js
module.exports = {
    clientId: 'plaid-client-id',
    secret: 'plaid-secret',
    access_token: 'access-development-your-bank-account-token',
}
```

now you can run main.js and your debt.json file will
populate with repayments per your matcher

you can run this daily against new transactions.

you can expand it to automate communications with the borrower, you, etc