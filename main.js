

const fs = require('fs').promises;
const plaidEnv = 'development';
const moment = require('moment');
const {clientId, secret, access_token } = require('./config');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const configuration = new Configuration({
  basePath: PlaidEnvironments[plaidEnv],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': clientId,
      'PLAID-SECRET': secret,
      'Plaid-Version': '2020-09-14',
    },
  },
});

const client = new PlaidApi(configuration);

async function getTransactions() {
  var now = new Date();
  let filename = 'plaid-transactions_' + now.getFullYear() + "-"+ now.getMonth() + "-" + now.getDate() +'.json'
  let data = null;
  try {
    data = JSON.parse(await fs.readFile(filename));
    console.log("Returning cached results")
  } catch(err) {
    // Pull transactions for the Item for the last 30 days
    // https://plaid.com/docs/api/products/#transactionsget
    const startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
    const endDate = moment().format('YYYY-MM-DD');
    const configs = {
      access_token: access_token,
      start_date: startDate,
      end_date: endDate,
      // options: {
      //   count: 250,
      //   offset: 0,
      // },
    };
    const transactionsResponse = await client.transactionsGet(configs);
    data = transactionsResponse.data;
    await fs.writeFile(filename, JSON.stringify(data, null, 4));
    console.log("Cached plaid transaction data into "+filename);
  }
  return data;
}

async function getDebt() {
  let filename = 'debt.json';
  let data = null;
  data = JSON.parse(await fs.readFile(filename));
  return {
    filename,
    ...data,
    matches: (str)=>new RegExp(data.matcher).test(str),
    startDate: new Date(data.startDate),
    repayments: data.repayments ? data.repayments.map(r=>({
      ...r, date: new Date(r.date)
    })) : []
  };
}

async function applyTransaction(debt, transaction) {
  debt.repayments.push({
    date: transaction.date,
    amount: transaction.amount,
    balance: getBalance(debt) + transaction.amount
  })
  console.log("writing ", debt.filename, debt)
  await fs.writeFile(debt.filename, JSON.stringify(debt, null, 4));
  return debt;
}

function getDate(debt) {
  let rp = debt.repayments[debt.repayments.length-1]
  return new Date(rp ? rp.date : debt.startDate);
}

function getBalance(debt) {
  let rp = debt.repayments[debt.repayments.length-1]
  return rp ? rp.balance : debt.startBalance;
}

async function main() {
  let debt = await getDebt();
  console.log(debt);
  let tx = await getTransactions();
  for (let transaction of tx.transactions.reverse()) {
    if (!debt.matches(transaction.name)) continue;
    if (new Date(transaction.date) > getDate(debt)) {
      debt = await applyTransaction(debt, transaction);
    }
  }      
}

main();