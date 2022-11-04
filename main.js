const api = require("./api");
const solver = require("./solver");
const utils = require("./utils");

const apiKey = utils.loadData("key.txt");
const currentMap = JSON.parse(utils.loadData("config.json")).map;

async function main(bagNum){


    console.log("Running: Bag " + bagNum);

    let days = JSON.parse(utils.loadData("config.json")).days;
    let response = await api.getMap(apiKey, currentMap);
    
    solution = {
        bagPrice: 1,
        refundAmount: 1,
        bagType: 1,
        recycleRefundChoice: true
    }

        solution = solver.solve(currentMap, solution, days);    
        let score = await api.submitGame(apiKey, currentMap, solution);
        console.log(solution);
        console.log(score);
    }

    /*
        scores.filter( e => e.score.score > 0 );
        scores.sort( (a,b) => b.score.score-a.score.score );
        
        const highest = scores.slice(0,3);
        
        for( const high of highest )
        {
            let highscore = await findScore(high, 0.5);
            highscore = await findScore(highscore, 0.2);
            highscore = await findScore(highscore, 0.1);
            highscore = await findScore(highscore, 0.01);

            console.log(highscore);
            console.log(highscore.score.dailys);
            let highscore = await getHighestScore(high.solution, high.score, 0.5);
            let newScore = await getHighestScore(highscore.solution, highscore.score, 0.5);

            console.log("initiating while loop");
            console.log(newScore.score.score > highscore.score.score);

            while( newScore.score.score > highscore.score.score){
                highscore = newScore;
                newScore = await getHighestScore(highscore.solution, highscore.score, 0.5);
            }

            highscore = await getHighestScore(high.solution, high.score, 0.2);
            newScore = await getHighestScore(highscore.solution, highscore.score, 0.2);

            console.log("initiating while loop");
            console.log(newScore.score.score > highscore.score.score);

            while( newScore.score.score > highscore.score.score){
                highscore = newScore;
                newScore = await getHighestScore(highscore.solution, highscore.score, 0.2);
            }

            console.log(highscore);
        }
    } */

    async function findScore( high, diff ){
        console.log("Working with diff: " + diff);

        let highscore = await getHighestScore(high.solution, high.score, diff);
        let newScore = await getHighestScore(highscore.solution, highscore.score, diff);

        while( newScore.score.score > highscore.score.score){
            highscore = newScore;
            newScore = await getHighestScore(highscore.solution, highscore.score, diff);
            console.log(newScore.score.score);
        }
        
        console.log(highscore.score.score);
        return highscore;
    }


async function getHighestScore(oldSolution, oldScore, diff){

    let solutions = [];

    for (let i = 0; i < 8; i++) {
        solutions.push({...oldSolution});
    }

    for (let i = 0; i < solutions.length; i++) {
        let solution = solutions[i];

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
        }
        solution.bagPrice = round(solution.bagPrice, 4);
        solution.refundAmount = round(solution.refundAmount, 4);
        let score = await api.submitGame(apiKey, currentMap, solution);
        let newSolution = {solution: {...solution}, score: score};
        newSolution.method = i;
        solutions[i] = newSolution;
    }
    solutions.sort( (a,b) => b.score.score-a.score.score);
    return solutions[0];
}

function round(value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}


module.exports = {
    main
}
  