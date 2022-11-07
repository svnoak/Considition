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


async function findScore(high, diff, response) {
	console.log("Working with diff: " + diff);

	let highscore = await getHighestScore(high.solution, high.score, diff, response);
	let newScore = await getHighestScore(highscore.solution, highscore.score, diff, response);

	while (newScore.score.score > highscore.score.score) {
		highscore = newScore;
		newScore = await getHighestScore(highscore.solution, highscore.score, diff, response);
		console.log(highscore.score);
	}
	return highscore;
}

async function getHighestScore(oldSolution, oldScore, diff, response) {
	let solutions = [];

	for (let i = 0; i < 8; i++) {
		solutions.push({ ...oldSolution });
	}

	for (let i = 0; i < solutions.length; i++) {
		let solution = solutions[i];

		switch (i) {
			case 0: // Method 0
				if (solution.refundAmount - diff > 0) solution.refundAmount -= diff;
				break;

			case 1: // Method 1
				solution.refundAmount += diff;
				break;

			case 2: // Method 2
				if (solution.bagPrice - diff > 0) solution.bagPrice -= diff;
				break;

			case 3: // Method 3
				solution.bagPrice += diff;
				break;

			case 4: // Method 4
				solution.bagPrice += diff;
				solution.refundAmount += diff;
				break;

			case 5: // Method 5
				if (solution.bagPrice - diff > 0) solution.bagPrice -= diff;
				solution.refundAmount += diff;
				break;

			case 6: // Method 6
				solution.bagPrice += diff;
				if (solution.refundAmount - diff > 0) solution.refundAmount -= diff;
				break;

			case 7: // Method 7
				if (solution.bagPrice - diff > 0) solution.bagPrice -= diff;
				if (solution.refundAmount - diff > 0) solution.refundAmount -= diff;
				break;
		}
		solution.bagPrice = utils.round(solution.bagPrice, 4);
		solution.refundAmount = utils.round(solution.refundAmount, 4);
		let score = await api.submitGame(apiKey, currentMap, solution);
		submitCounter++;

		let newSolution = { solution: { ...solution }, score: score };
		newSolution.method = i;
		solutions[i] = newSolution;
	}
	solutions.sort((a, b) => b.score.score - a.score.score);
	console.log(solutions[0].score.score);
	return solutions[0];
}

module.exports = {
    solve,
    findScore
}