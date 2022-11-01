const api = require("./api");
const solver = require("./solver");

const apiKey = "4d623da4-d9fe-403a-4806-08da97ce1ad5"; //TODO: Your api key here
//The different map names can be found on considition.com/rules
const currentMap = "FancyVille"; //Todo: Your map choice here

// TODO: You bag type choice here. Unless changed, the bag type 1 will be selected.
const consumerPrice = 0.9; // percent of bag

const bagTypes = [1,2,3,4,5];
const recycleRefundChoice = [true, false];


async function main(){
    let progsubs = [];
    for (const bagType of bagTypes) {
        for (const recycle of recycleRefundChoice) {
            for (let i = 1.1; i <= 50; i+0.5) {
                for (let j = 0.1; j < 1; j+0.2) {
                    progsubs.push({bagType: bagType, recycle: recycle, bagPrice: i, refund: j});
                }
            }
        }
    }

    console.log("Progsubs finished");

    let days = 31;
    let submissions = [];
        let response = await api.getMap(apiKey, currentMap);
        for (const sub of progsubs) {
            let solution = solver.solve(response, sub, days);
            let score = await api.submitGame(apiKey, currentMap, solution);
            submissions.push({solution: {...solution}, score: score});
        }

        submissions.forEach(e => console.log(e.solution.bagType + " " + e.score.score));
}

main();