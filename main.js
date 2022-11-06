const api = require("./api");
const solver = require("./solver");
const utils = require("./utils");
const orders = require("./optisolve");

let bagType_price = [1.7, 1.75, 6, 25, 200];
let bagType_co2_production = [5, 7, 3, 6, 20];
let bagType_co2_transport = [50, 40, 60, 70, 100];

const apiKey = utils.loadData("key.txt");
const currentMap = JSON.parse(utils.loadData("config.json")).map;
let days = JSON.parse(utils.loadData("config.json")).days;


async function main(bagNum){

    let response = await api.getMap(apiKey, currentMap);
    console.log("Running: Bag " + bagNum);

    let subs = utils.loadData(`results_bag${bagNum}.json`);
    let unique;

    /**
     * If there is no data since before, we need to run the algorithm from scratch to generate the data.
     */
    if( subs != undefined ){
        console.log("SUBS EXIST");
        unique = JSON.parse(subs);
    } else {
        console.log("CREATING SUBS");
        const prices = [0.1, 4, 6, 10];
        const refunds = [0.1,0.4,0.8];
        const recycles = [true, false];
        const bagType = bagNum;
    
        for (const recycleRefundChoice of recycles) {
            for (const refundAmount of refunds) {
                for (const bagPrice of prices) {
                    subs.push({bagPrice, refundAmount, bagType, recycleRefundChoice});
                }
            }
        }
        let solutions = [];
        for (const sub of subs) {
            let solution = solver.solve(response, sub, days);
            solution.bagPrice = round(solution.bagPrice, 3);
            solution.refundAmount = round(solution.refundAmount, 3);
            solutions.push({...solution});
    }

    let scores = [];
    console.log("MAIN SOLUTIONS");
    console.log(solutions.length);
    for (const solution of solutions) {
        let score = await api.submitGame(apiKey, currentMap, solution);
        console.log(score.score);

        scores.push({solution: {...solution}, score});
    }
        scores.filter( e => e.score.score > 0 );
        scores.sort( (a,b) => b.score.score-a.score.score );
        
        let highest = scores.slice(0,3);

        for (let i = 0; i < highest.length; i++) {
            const high = highest[i];
            let highscore = await findScore(high, 0.5, response);
            highscore = await findScore(highscore, 0.2, response);
            highscore = await findScore(highscore, 0.1, response);
            highscore = await findScore(highscore, 0.01, response);

            highest[i] = {...highscore};
            utils.storeData(highscore, `results_bag${bagNum}.json`, false);
        }

        unique = highest
            .map(e => e.solution['bagPrice']+"_"+e.solution['refundAmount'])
            .map((e, i, final) => final.indexOf(e) === i && i)
            .filter(obj=> highest[obj])
            .map(e => highest[e]);

        unique.sort( (a,b) => b.score.score-a.score.score );
        utils.storeData(unique, `results_bag${bagNum}.json`, true);
    }

        console.log("STARTING ORDERS ALGORITHM");
        for (let i = 0; i < unique.length; i++) {
            const high = unique[i];
            
            let highscore = await findOrders(high, 200);
            highscore = await findOrders(highscore, 100);
            highscore = await findOrders(highscore, 50);
            highscore = await findOrders(highscore, 25);
            highscore = await findOrders(highscore, 10);
            highscore = await findOrders(highscore, 1);

            unique[i] = {...highscore};
            unique.sort( (a,b) => b.score.score-a.score.score );
            console.log(unique[0].score.score);

            /**
             * Skit i solve filen!
             * Vi behöver göra en while loop som är liknande som metoderna.
             * Vi behöver antingen börja med att bara lägga saker i början på veckan och sen arbeta oss uppåt
             * För vi har en daily som vi kan jämföra med. Är customerScore lägre än i OG-daily måste vi öka produktionen
             * Är customerScore samma så kan vi sänka produktionen.
             * Frågan är om det går att göra i steg om tex 5 eller behöver vara större för att sedan finjustera i slutet.
             * 
             * Tänker det är bra att mäta minst en hel månad, men får se hur många submits det blir då...
             */
        }
        
    }

    async function findOrders( high, diff, response ){
        console.log(high.solution.orders);

        console.log( "ORDERS working with diff: " + diff );
        let highscore = await getOrderAmount(high, diff);
        let newScore = await getOrderAmount(highscore, diff);

        while( newScore.score.score > highscore.score.score ){
            highscore = newScore;
            newScore = await getOrderAmount(highscore, diff);
        }
        return highscore;
    }

    async function getOrderAmount(high, diff){
        let solutions = [];
        let oldOrders = high.solution.orders;

        let maxDiff = true;
        let count = 0;
        singleOrder = oldOrders[0];

        while( maxDiff ){
            if( singleOrder - diff*count > 0 ){
                singleOrder -= diff*count;
                count++;
            } else {
                maxDiff = false;
            }
        }

        for( let i = 0; i < count; i++ ){
            solutions.push({...high});
        }

        for( let i = 0; i < solutions.length; i++ ){
            let solution = solutions[i].solution;

            solutions[i].solution.orders = [];

            if( oldOrders[0] - diff*i > 0 ){
                for( let k = 0; k < days; k++ ){
                    solutions[i].solution.orders.push(oldOrders[0]- diff*i); 
                }
            }
            let newScore = await api.submitGame(apiKey, currentMap, solution);
            solutions[i] = {solution: {...solution}, score: newScore};
        }
        solutions.sort( (a,b) => b.score.score-a.score.score);

        console.log("SOLUTIONS");
        solutions.forEach( e => {
            console.log("SCORE: " + e.score.score)
            console.log(e.solution.orders) 
        
        });

        return solutions[0];
    }

    async function findScore( high, diff, response ){
        console.log("Working with diff: " + diff);

        let highscore = await getHighestScore(high.solution, high.score, diff, response);
        let newScore = await getHighestScore(highscore.solution, highscore.score, diff, response);

        while( newScore.score.score > highscore.score.score ){
            highscore = newScore;
            newScore = await getHighestScore(highscore.solution, highscore.score, diff, response);
        }
        return highscore;
    }


async function getHighestScore(oldSolution, oldScore, diff , response){

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
        let bestOrders = [];
/*         for(let i = 1; i <= 5; i++){
            solution = orders.solve(response, solution, days, i*10);
            score = await api.submitGame(apiKey, currentMap, solution);
            bestOrders.push({score: score, orders: solution.orders});
            bestOrders.sort( (a,b) => b.score.score-a.score.score );
            score = bestOrders[0];
            console.log(score.score.score);
        } */

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
  