const {isUndefined} = require("axios/lib/utils");

let bagType_price = [1.7, 1.75, 6, 25, 200];
let bagType_co2_production = [5, 7, 3, 6, 20];
let bagType_co2_transport = [50, 40, 60, 70, 100];
let solution = {};

/**
 * Tries to solve the given map.
 * @param   map             The chosen map.
 * @param   bagType         The chosen bag type.
 * @param   days            Days to run simulation. Should be 365 days unless it is a training map, where it is 31.
 * @returns A solution with bag orders per day and other attributes.
 */

function solve(map, sub, days) {

    solution.recycleRefundChoice = sub.recycleRefundChoice;
    solution.bagPrice = bagType_price[sub.bagType-1] * sub.bagPrice;
    solution.refundAmount = bagType_price[sub.bagType-1] * sub.refundAmount;
    solution.bagType = sub.bagType;
    
    solution.orders = [];
    //solution.orders = [10,10,10,10,10,10,10,10,10,0,0,0,0,0,0,10,0,0,10,10,10,10,0,0,0,10,10,0,0,0,0]
     for (let day = 0; day < days; day++) {
        solution.orders.push(Math.round(wasteMoney(sub.bagType, map.companyBudget)));
    }
        
    return solution;
}

// Solution 1: "Spend all money day 1"
function wasteMoney(bagtype, companyBudget) {
    return Math.floor(companyBudget / bagType_price[bagtype-1]);
}

// Solution 2: "Spend equally money every day"
function splitMoney(bagtype, companyBudget, days) {
    return Math.floor(companyBudget / bagType_price[bagtype-1] / days);
}

// Solution 3: "Everyone get one bag every day"
function holdMoney(bagtype, companyBudget, population, days) {
    return Math.floor(companyBudget / bagType_price[bagtype-1] / population*2 / days);
}

module.exports = {
    solve
}