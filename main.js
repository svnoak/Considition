const api = require("./api");
const solver = require("./solver");
const utils = require("./utils");
const orders = require("./optisolve");
const fs = require("fs");

let bagType_price = [1.7, 1.75, 6, 25, 200];
let bagType_co2_production = [30, 24, 36, 42, 60];
let bagType_co2_transport = [3, 4.2, 1.8, 3.6, 12];

const apiKey = utils.loadData("key.txt");
const currentMap = JSON.parse(utils.loadData("config.json")).map;
let days = JSON.parse(utils.loadData("config.json")).days;
let bagType;
let submitCounter = 0;
let path;
let pathOrders;

async function main(bagNum) {
    path = `./results/results_bag${bagNum}_${currentMap}.json`;

    fs.exists(path, function (isExist) {
  if (!isExist) {
    utils.storeData([], path);
  }
});

	let response = await api.getMap(apiKey, currentMap);
	bagType = bagNum;

	console.log("Running: Bag " + bagNum);

	let subs = JSON.parse(utils.loadData(path));

	let unique = JSON.parse(utils.loadData(path));

	/**
	 * If there is no data since before, we need to run the algorithm from scratch to generate the data.
	 */

	console.log(subs.length);

	let stepOneSuccess = false;
	let stepTwoSuccess = false;
	let stepThreeSuccess = false;
	let stepFourSuccess = false;

	console.log("CREATING SUBS");
	const prices = [0.1, 4, 6, 10];
	const refunds = [0.1, 0.4, 0.8];
	const recycles = [true, false];
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

	if (subs.length < 1) {
		while( !stepOneSuccess ){
			try {			
					let scores = [];
					console.log("STARTING STEP 1 - GENERAL SOLUTIONS");
					console.log(solutions.length);
					for (const solution of solutions) {
						let score = await api.submitGame(apiKey, currentMap, solution);
						submitCounter++;
						console.log(score.score);
			
						scores.push({ solution: { ...solution }, score, step: 1 });
			
					}
					scores.filter((e) => e.score.score > 0);
					scores.sort((a, b) => b.score.score - a.score.score);
			
					unique = scores.slice(0, 3);
					console.log("STEP 1 COMPLETE - SAVING DATA");
					utils.storeData(unique, path, false);
					stepOneSuccess = true;
			} catch (error) {
				console.log("STEP 1 FAILED - TRYING AGAIN");
			}
		}
	}

	if( unique[0].step < 2 ){
		while( !stepTwoSuccess ){
			try {
					console.log("STARTING STEP 2 - FIND PRICES");
			
					for (let i = 0; i < unique.length; i++) {
						const high = unique[i];
						let highscore = await findScore(high, 0.5, response);
						highscore = await findScore(highscore, 0.2, response);
						highscore = await findScore(highscore, 0.1, response);
						highscore = await findScore(highscore, 0.01, response);
			
						unique[i] = { ...highscore };
						unique[i].step = 2;
						//utils.storeData(highscore, path, false);
					}
			
					unique = unique
						.map((e) => e.solution["bagPrice"] + "_" + e.solution["refundAmount"])
						.map((e, i, final) => final.indexOf(e) === i && i)
						.filter((obj) => unique[obj])
						.map((e) => unique[e]);
			
					unique.sort((a, b) => b.score.score - a.score.score);
					utils.storeData(unique, path, true);
					console.log("STEP 2 COMPLETE - SAVING DATA");
					stepTwoSuccess = true;
			} catch (error) {
				console.log("STEP 2 FAILED - TRYING AGAIN")
			}
		}
	}
    
    /* 
	if( unique[0].step < 3 ){
		while( !stepThreeSuccess ){
			try {
				console.log("STARTING STEP 3 - MINIMUM ORDERS");
					for (let i = 0; i < unique.length; i++) {
						const high = unique[i];
			
						let highscore = await findOrders(high, 200);
						highscore = await findOrders(highscore, 100);
						highscore = await findOrders(highscore, 50);
						highscore = await findOrders(highscore, 25);
						highscore = await findOrders(highscore, 10);
						highscore = await findOrders(highscore, 1);
			
						unique[i] = { ...highscore };
						unique[i].step = 3;
					}
					utils.storeData(unique, path, true);
					console.log("STEP 3 COMPLETE - SAVING DATA");
					stepThreeSuccess = true;
			} catch (error) {
				console.log("STEP 3 FAILED - TRYING AGAIN");
			}
		}
	} */

	/**
	 * FINDS MINIMUM NEEDED BAGS
	 */
	while( !stepFourSuccess ){
		try {
            for( sol of unique ){
                let minimumInterval = await findInterval(sol);
            }
			stepFourSuccess = true;
		} catch (error) {
            console.log(error);
			console.log("STEP 4 FAILED - TRYING AGAIN");
		}
	}

	console.log("BAG "+ bagType +" ALGORITHM DONEEEEE!")	
}

async function findInterval(solution) {
	console.log("STARTING STEP 4 - FINDING ORDER INTERVAL");

	let order = 0;
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
    let totalCondition = 1;

	console.log("STARTING WHILE LOOP");

    let highscore = await api.submitGame(apiKey, currentMap, solution.solution);
    let day = 0;
    let saveScore = {
        score: highscore.dailys[day].positiveCustomerScore - Math.abs(highscore.dailys[day].negativeCustomerScore) - highscore.dailys[day].c02,
        day: day 
    }
	while (condition) {
        
		console.log("GAME SUBMISSION");

        solution.solution.orders[day] += 5;
        console.log(day);
		let newScore = await api.submitGame(apiKey, currentMap, solution.solution);
        
		submitCounter++;
		console.log("GAME SUBMITTED");

		for (let i = day; i < newScore.dailys.length; i++) {

			newDay = newScore.dailys[i];
			oldDay = solution.score.dailys[i];

			//let day = i-1 > 0 ? i-1 : 0;
            
            let oldDailyScore = oldDay.positiveCustomerScore - Math.abs(oldDay.negativeCustomerScore) - oldDay.c02;
			let newDailyScore = newDay.positiveCustomerScore - Math.abs(newDay.negativeCustomerScore) - newDay.c02;

            if( saveScore.day != day ) saveScore = { score: -200000000, day: day};

            if( saveScore.day == day && newDailyScore > saveScore.score ){
                saveScore = {
                    score: newDailyScore,
                    day: day }
            }

            console.log(saveScore);

            console.log("---------");
			console.log("Day: " + i);
			console.log("Bags: ", solution.solution.orders[i] );
			//console.log("Bags in Transport: ", bagsInTransport(newDay.c02, solution.solution.orders));
			console.log("Budget: ", oldDay.companyBudget, newDay.companyBudget);
			console.log("CO2: ", oldDay.c02, newDay.c02);
			console.log("NCS: ", oldDay.negativeCustomerScore, newDay.negativeCustomerScore);
			console.log("CS: ", oldDay.positiveCustomerScore, newDay.positiveCustomerScore);
			console.log("Daily Score: ", Math.floor(oldDailyScore), Math.floor(newDailyScore));
			console.log("---------");

            console.log("POSITIVE LARGER OR SAME: ", newDay.positiveCustomerScore >= oldDay.positiveCustomerScore );
            console.log("NCS is 0: ", newDay.negativeCustomerScore == 0);
            console.log("CO2 is lower: ", newDay.c02 < oldDay.c02);

            utils.storeData(solution.solution.orders, `./orders/orders_bag${bagType}_${currentMap}_${totalCondition}.json`);

            if( newDay.positiveCustomerScore >= oldDay.positiveCustomerScore && 
                newDay.negativeCustomerScore == 0 &&
                Math.floor(newDay.c02) < Math.floor(oldDay.c02)
                ){
                    console.log("OPTIMAL DAY - CONTINUE")
                    day++;
                    highscore = newScore;
                    continue;
            } else {
                if( saveScore.score > newDailyScore  ){
                    solution.solution.orders[day] -= 1;
                    day++;
                    highscore = newScore;
                    continue;
                }

                if (i == newScore.dailys.length - 1) {
                    condition = false;
                    console.log(solution.score.score, newScore.score);
                    console.log("TOTAL SUBMITS: " + submitCounter);
                    totalCondition++;
                }
                console.log("BREAKING - ADDING BAG");
                break;
            }

			
		}
	}
}

function bagsInTransport(co2, orders){
	const Ap = orders.reduce((a,b) => a+b, 0);
	const Pcp = bagType_co2_production[bagType-1];
	const Pct = bagType_co2_transport[bagType-1];
	return (co2-( Ap * Pcp )) / Pct;
}

async function findOrders(high, diff) {
	console.log("ORDERS working with diff: " + diff);
	let highscore = await getOrderAmount(high, diff);
	let newScore = await getOrderAmount(highscore, diff);

	while (newScore.score.score > highscore.score.score) {
		highscore = newScore;
		newScore = await getOrderAmount(highscore, diff);
	}
	console.log(highscore.score.score);
	return highscore;
}

/**
 * HÄR KOLLAR VI OCKSÅ BARA SCORE! MEN VI KANSKE BORDE KOLLA PÅ NEGATIVE OCH POSITIVE CS FÖR ATT FÅ FRAM BÄST RESULTAT?
 */

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
		submitCounter++;
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
		console.log(highscore.score.score);
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
		submitCounter++;

		let newSolution = { solution: { ...solution }, score: score };
		newSolution.method = i;
		solutions[i] = newSolution;
	}
	solutions.sort((a, b) => b.score.score - a.score.score);
	console.log(solutions[0].score.score);
	return solutions[0];
}

function round(value, precision) {
	var multiplier = Math.pow(10, precision || 0);
	return Math.round(value * multiplier) / multiplier;
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

module.exports = {
	main,
};
