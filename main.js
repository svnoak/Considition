const api = require("./api");
const solver = require("./solver");
const fs = require('fs')

const storeData = (data, path) => {
    try {
        fs.writeFileSync(path, JSON.stringify(data))
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


const apiKey = loadData("key.txt"); //TODO: Your api key here
//The different map names can be found on considition.com/rules
const currentMap = "FancyVille"; //Todo: Your map choice here

// TODO: You bag type choice here. Unless changed, the bag type 1 will be selected.

async function main(){

    let days = 31;
    let response = await api.getMap(apiKey, currentMap);
    
    const dataCrunch = false;
    

    if( dataCrunch ){
        const prices = [];
    const refunds = [];
    const bagTypes = [1,2,3,4,5];
    const recycles = [true, false];

    let subs = [];

    for (let i = 0; i <= 10; i++) {
        if( i == 0 ){
            prices.push(i+0.1);
            refunds.push(i+0.1);
        } else {
            prices.push(i/2);
            refunds.push(i/2)
        }
    }

    console.log(prices);

    for (const recycleRefundChoice of recycles) {
        for (const bagType of bagTypes) {
            for (const refundAmount of refunds) {
                for (const bagPrice of prices) {
                  subs.push({bagPrice, refundAmount, bagType, recycleRefundChoice});
                }
            }
        }
    }

    let solutions = [];
    for (const sub of subs) {
        let solution = solver.solve(response, sub, days);
        let copy = {...solution};
        copy.bagPrice = sub.bagPrice;
        copy.refundAmount = sub.refundAmount;
        solutions.push({...solution});
    }

    console.log(solutions.length);

    let scores = [];

    for (const solution of solutions) {
        let score = await api.submitGame(apiKey, currentMap, solution);
        scores.push({solution: {...solution}, score});
    }
        scores.sort( (a,b) => a.score.score-b.score.score );
        
        const highest = scores[scores.length-1];

        storeData(highest, "solution.json");
    } else {
        let lastSolution = JSON.parse(loadData("solution.json"));
        let solution = solver.solve(response, lastSolution.solution, days);
        let score = await api.submitGame(apiKey, currentMap, solution);
        
        if( lastSolution.score.score > score.score ) {
            console.log("Worse than last time");
            console.log("Old: " + lastSolution.score.score);
            console.log("New: " + score.score);

        } else if( lastSolution.score.score == score.score )
        {
            console.log("Same as last time");
        } else {
            console.log("Better than last time");
            console.log("Old: " + lastSolution.score.score);
            console.log("New: " + score.score);
        }   
    }
}


main();
  