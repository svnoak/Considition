﻿const api = require("./api");
const solver = require("./solver");
const utils = require("./utils");

const apiKey = utils.loadData("key.txt");
const currentMap = JSON.parse(utils.loadData("config.json")).map;

async function main(bagNum){

    console.log(currentMap);

    let days = JSON.parse(utils.loadData("config.json")).days;
    let response = await api.getMap(apiKey, currentMap);
    
    const prices = [];
    const refunds = [];
    const recycles = [true, false];
    const bagType = bagNum;

    let subs = [];

    for (let i = 0; i <= 2; i++) {
        if( i == 0 ){
            prices.push(i+0.1);
            refunds.push(i+0.1);
        } else {
            prices.push(i*2);
            refunds.push(i*2)
        }
    }

    for (const recycleRefundChoice of recycles) {
        for (const refundAmount of refunds) {
            for (const bagPrice of prices) {
                subs.push({bagPrice, refundAmount, bagType, recycleRefundChoice});
            }
        }
    }

    console.log(subs);


    let solutions = [];
    for (const sub of subs) {
        let solution = solver.solve(response, sub, days);
        solutions.push({...solution});
    }

    console.log(solutions.length);

    let scores = [];

    for (const solution of solutions) {
        let score = await api.submitGame(apiKey, currentMap, solution);
        scores.push({solution: {...solution}, score});
    }
        scores.filter( e => e.score.score > 0 );
        scores.sort( (a,b) => b.score.score-a.score.score );
        
        const highest = scores.slice(0,3);
        
        for( const high of highest )
        {
            getLargestDiff(high.solution);
        }

    }


function getLargestDiff(oldSolution){

    console.log(oldSolution);

    let solutions = [];

    const diff = 0.5;

    for (let i = 0; i < 8; i++) {
        solutions.push({...oldSolution});
    }

    for (let i = 0; i < solutions.length; i++) {
        const  solution = solutions[i];

        switch (i) {
            case 0: // Method 0
                if( solution.refundAmount - diff > 0)
                    solution.refundAmount -= diff;
                break;

            case 1: // Method 1
                solution.refundAmount += diff;
                break;

            case 2: // Method 2
                if( solution.bagPrice - diff > 0)
                    solution.bagPrice -= diff;
                break;
            
            case 3: // Method 3
                solution.bagPrice += diff;
                break;
            
            case 4: // Method 4
                solution.bagPrice += diff;
                solution.refundAmount += diff;
                break;

            case 5: // Method 5
                if( solution.bagPrice - diff > 0)
                    solution.bagPrice -= diff;
                solution.refundAmount += diff;
                break;

            case 6: // Method 6
                solution.bagPrice += diff;
                if( solution.refundAmount - diff > 0)
                    solution.refundAmount -= diff;
                break;

            case 7: // Method 7
                if( solution.bagPrice - diff > 0)
                    solution.bagPrice -= diff;
                if( solution.refundAmount - diff > 0)
                    solution.refundAmount -= diff;
                break;

            let score = api.submitGame(apiKey, currentMap, solution);
            solution = {solution: {...solution}, score: score};
            solution.method = i;
        }
    }
}

module.exports = {
    main
}
  