﻿const api = require("./api");
const solver = require("./solver");
const utils = require("./utils");
const orders = require("./optisolve");

let bagType_price = [1.7, 1.75, 6, 25, 200];
let bagType_co2_production = [5, 7, 3, 6, 20];
let bagType_co2_transport = [50, 40, 60, 70, 100];

const apiKey = utils.loadData("key.txt");
const currentMap = JSON.parse(utils.loadData("config.json")).map;
let days = JSON.parse(utils.loadData("config.json")).days;

async function main(bagNum) {
	let response = await api.getMap(apiKey, currentMap);
	console.log("Running: Bag " + bagNum);

	let subs = utils.loadData(`results_bag${bagNum}.json`);
	let unique;

	/**
	 * If there is no data since before, we need to run the algorithm from scratch to generate the data.
	 */
	if (subs != undefined) {
		console.log("SUBS EXIST");
		unique = JSON.parse(subs);
	} else {
		console.log("CREATING SUBS");
		const prices = [0.1, 4, 6, 10];
		const refunds = [0.1, 0.4, 0.8];
		const recycles = [true, false];
		const bagType = bagNum;
		console.log(subs);
		for (const recycleRefundChoice of recycles) {
			for (const refundAmount of refunds) {
				for (const bagPrice of prices) {
					subs.push({ bagPrice, refundAmount, bagType, recycleRefundChoice });
				}
			}
		}
		let solutions = [];
		for (const sub of subs) {
			let solution = solver.solve(response, sub, days);
			solution.bagPrice = round(solution.bagPrice, 3);
			solution.refundAmount = round(solution.refundAmount, 3);
			solutions.push({ ...solution });
		}

		let scores = [];
		console.log("MAIN SOLUTIONS");
		console.log(solutions.length);
		for (const solution of solutions) {
			let score = await api.submitGame(apiKey, currentMap, solution);
			console.log(score.score);

			scores.push({ solution: { ...solution }, score });
		}
		scores.filter((e) => e.score.score > 0);
		scores.sort((a, b) => b.score.score - a.score.score);

		let highest = scores.slice(0, 3);

		for (let i = 0; i < highest.length; i++) {
			const high = highest[i];
			let highscore = await findScore(high, 0.5, response);
			highscore = await findScore(highscore, 0.2, response);
			highscore = await findScore(highscore, 0.1, response);
			highscore = await findScore(highscore, 0.01, response);

			highest[i] = { ...highscore };
			utils.storeData(highscore, `results_bag${bagNum}.json`, false);
		}

		unique = highest
			.map((e) => e.solution["bagPrice"] + "_" + e.solution["refundAmount"])
			.map((e, i, final) => final.indexOf(e) === i && i)
			.filter((obj) => highest[obj])
			.map((e) => highest[e]);

		unique.sort((a, b) => b.score.score - a.score.score);
		utils.storeData(unique, `results_bag${bagNum}.json`, true);
	}

	/**
	 * FINDS MINIMUM NEEDED BAGS
	 */
	console.log("STARTING ORDERS ALGORITHM");
	for (let i = 0; i < unique.length; i++) {
		const high = unique[i];

		let highscore = await findOrders(high, 200);
		highscore = await findOrders(highscore, 100);
		highscore = await findOrders(highscore, 50);
		highscore = await findOrders(highscore, 25);
		highscore = await findOrders(highscore, 10);
		highscore = await findOrders(highscore, 1);

		unique[i] = { ...highscore };
	}

	utils.storeData(unique, `results_bag${bagNum}.json`, true);

	// let data = JSON.parse(utils.loadData(`results_bag${bagNum}.json`));
	let minimumInterval = await findInterval(unique[0]);
}

async function findInterval(solution) {
	console.log("FINDIN INTERVAL");

	let order = solution.solution.orders[0];
	solution.solution.orders = [];

	if (solution.solution.orders.length < 1) {
		for (let i = 0; i < days; i++) {
			if (i < 1) {
				solution.solution.orders.push(order);
			} else {
				solution.solution.orders.push(0);
			}
		}
	}

	let condition = true;

	console.log("STARTING WHILE LOOP");

	while (condition) {
		console.log("GAME SUBMISSION");
		let newScore = await api.submitGame(apiKey, currentMap, solution.solution);
		console.log("GAME SUBMITTED");

		console.log(newScore.dailys.length);

		for (let i = 0; i < newScore.dailys.length; i++) {
			console.log(i);
			newDay = newScore.dailys[i];
			oldDay = solution.score.dailys[i];
			console.log("------------------------------------------");
			console.log("CustomerScores:");
			console.log(oldDay.positiveCustomerScore, newDay.positiveCustomerScore);
			console.log("");
			console.log("Bags: " + solution.solution.orders[i]);
			console.log("");
			console.log("CO2");
			console.log(solution.score.dailys[i].c02, newScore.dailys[i].c02);
			console.log("");
			console.log("TOTAL SCORE");
			console.log(
				oldDay.positiveCustomerScore - solution.score.dailys[i].c02,
				newDay.positiveCustomerScore - newScore.dailys[i].c02
			);
			console.log("");
			console.log("POTENTIAL SCORE");
			console.log(oldDay.positiveCustomerScore - newScore.dailys[i].c02);
			console.log("------------------------------------------");
			if (oldDay.positiveCustomerScore > newDay.positiveCustomerScore && oldDay.c02 > newDay.c02) {
				solution.solution.orders[i] += 10;
				console.log(solution.solution.orders[i]);
				break;
			}

			/**
			 * TODO
			 * CREATE ORDER.JSON FILES FOR EACH UNIQUE SOLUTION
			 */
			utils.storeData(solution.solution.orders, "order.json");

			if (i == newScore.dailys.length - 1) {
				condition = false;
				console.log(solution.score.score, newScore.score);
			}
		}
	}
}

async function findOrders(high, diff) {
	console.log("ORDERS working with diff: " + diff);
	let highscore = await getOrderAmount(high, diff);
	let newScore = await getOrderAmount(highscore, diff);

	while (newScore.score.score > highscore.score.score) {
		highscore = newScore;
		newScore = await getOrderAmount(highscore, diff);
	}
	return highscore;
}

async function getOrderAmount(high, diff) {
	let oldOrders = high.solution.orders;
	let count = 0;

	let solutionsArray = [high];

	while (oldOrders[0] - diff * count > 0) {
		let solution = { ...high.solution };

		solution.orders = [];
		for (let k = 0; k < days; k++) {
			solution.orders.push(oldOrders[0] - diff * count);
		}

		let newScore = await api.submitGame(apiKey, currentMap, solution);
		let newObject = { solution: { ...solution }, score: newScore };

		if (newScore.score >= solutionsArray[count].score.score) {
			solutionsArray.push(newObject);
		} else {
			return solutionsArray[count];
		}
		count++;
	}
	return solutionsArray[solutionsArray.length - 1];
}

async function findScore(high, diff, response) {
	console.log("Working with diff: " + diff);

	let highscore = await getHighestScore(high.solution, high.score, diff, response);
	let newScore = await getHighestScore(highscore.solution, highscore.score, diff, response);

	while (newScore.score.score > highscore.score.score) {
		highscore = newScore;
		newScore = await getHighestScore(highscore.solution, highscore.score, diff, response);
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
		solution.bagPrice = round(solution.bagPrice, 4);
		solution.refundAmount = round(solution.refundAmount, 4);
		let score = await api.submitGame(apiKey, currentMap, solution);

		let newSolution = { solution: { ...solution }, score: score };
		newSolution.method = i;
		solutions[i] = newSolution;
	}
	solutions.sort((a, b) => b.score.score - a.score.score);
	return solutions[0];
}

function round(value, precision) {
	var multiplier = Math.pow(10, precision || 0);
	return Math.round(value * multiplier) / multiplier;
}

module.exports = {
	main,
};
