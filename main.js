const api = require("./api");
const solver = require("./solver");

const apiKey = ""; //TODO: Your api key here
//The different map names can be found on considition.com/rules
const currentMap = "training1"; //Todo: Your map choice here

// TODO: You bag type choice here. Unless changed, the bag type 1 will be selected.
const bag_type = 1

async function main(){
    let response = await api.getMap(apiKey, currentMap)
    let days = 31;
    if (currentMap != "training1" && currentMap == "training2") {
        days = 365;
    }
    let solution = solver.solve(response, bag_type, days);
    let score = await api.submitGame(apiKey, currentMap, solution);
    console.log(score);
}

main();