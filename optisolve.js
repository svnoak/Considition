const {isUndefined} = require("axios/lib/utils");

let bagType_price = [1.7, 1.75, 6, 25, 200];
let washTime = [1, 2, 3, 5, 7];
const reuse = [0, 1,5,9,12]
let bagType_co2_production = [5, 7, 3, 6, 20];
let bagType_co2_transport = [50, 40, 60, 70, 100];
let solution = {};
const pickup = 7;

/**
 * Tries to solve the given map.
 * @param   map             The chosen map.
 * @param   bagType         The chosen bag type.
 * @param   days            Days to run simulation. Should be 365 days unless it is a training map, where it is 31.
 * @returns A solution with bag orders per day and other attributes.
 */

 function bbp(population,bagType, x){
    const period = (pickup + washTime[bagType-1])*reuse[bagType-1];
    return {bbp: period * (population * x), period: period}; 
}

function solve(map, sub, bestDaily, days, factor) {

    solution.recycleRefundChoice = sub.solution.recycleRefundChoice;
    solution.bagPrice = sub.solution.bagPrice;
    solution.refundAmount = sub.solution.refundAmount;
    solution.bagType = sub.solution.bagType;

    solution.orders = [];

    

    const obj = bbp(map.population, solution.bagType, factor);
    const period = obj.period;
    const orderAmount = obj.bbp;

    for (let day = 0; day < days; day++) {
        if( day == 0 || day % period == 0 ){
            solution.orders.push(orderAmount);
        } else {
            solution.orders.push(0);
        }
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