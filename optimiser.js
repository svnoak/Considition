const api = require("./api");
const orders = require("./optisolve");
const utils = require("./utils");

const apiKey = utils.loadData("key.txt");
const currentMap = JSON.parse(utils.loadData("config.json")).map;
console.log(currentMap);

async function main(bagNum){

    console.log("Running: Bag " + bagNum);

    let days = JSON.parse(utils.loadData("config.json")).days;
    let response = await api.getMap(apiKey, currentMap);

    let bestSolutions = JSON.parse(utils.loadData(`results_bag${bagNum}.json`));

    for (const solution of bestSolutions) {
        for (let i = 1; i <= 10; i++) {
            let newSolution = orders.solve(response, solution.solution, days, i*10);
            let newScore = await api.submitGame(apiKey, currentMap, newSolution);
            console.log(newScore.score);
            console.log(newScore.dailys[9]);
            console.log(newScore.dailys);
        }
    }


   /*  for (const solution of bestSolutions) {
        let oldSolution = solution;
        let newSolution = optisolve.solve(response, oldSolution, days);
        console.log("Starting whileloop");
        
        while( true ){
            let newScore = await api.submitGame(apiKey, currentMap, newSolution);
            oldSolution = {solution: {...newSolution}, score: newScore };
            newSolution = optisolve.solve(response, oldSolution, days);

            console.log(newScore.score);
            console.log(newScore.dailys);
        }
    } */
}

function round(value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}


module.exports = {
    main
}
  