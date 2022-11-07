const fs = require('fs');

const storeData = (data, path) => {
    try {
          fs.writeFileSync(path, JSON.stringify(data, null, 4));        
    } catch (err) {
        console.error(err)
    }
}

const loadData = (path) => {
    try {
      return fs.readFileSync(path, 'utf8')
    } catch (err) {
      console.error(err)
      return false
    }
  }

function TableItem(old, newest) {
  this.c02 = old.c02;
  this.c02 = newest.c02;
  this.negativeCustomerScore = old.negativeCustomerScore;
  this.negativeCustomerScore = newest.negativeCustomerScore;
  this.positiveCustomerScore = old.positiveCustomerScore;
  this.positiveCustomerScore = newest.positiveCustomerScore;
}

function logTable(oldDailys, newDailys) {
  let table = [];
  for (let i = 0; i < oldDailys.length; i++) {
    table.push(new TableItem(oldDailys[i], newDailys[i]));
  }
  console.log(table);
}

function round(value, precision) {
	var multiplier = Math.pow(10, precision || 0);
	return Math.round(value * multiplier) / multiplier;
}

module.exports = {
    storeData,
    loadData,
    logTable,
    round
}