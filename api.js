const axios = require("axios");
const https = require("https");
const BASE_PATH = "https://api.considition.com/api/game/"; 

let instance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true
    })
});

async function getMap(apiKey, mapName) {
    let config = {
        headers: {
            "x-api-key": apiKey
        }
    };

    try {
       
        let response = await instance.get(`${BASE_PATH}/mapInfo?MapName=${mapName}`, config);
        return response.data;
    } catch (err) {
        console.log("Fatal Error: could not start a new game");

        if (err.response) {
            console.log("Error: " + err.response.message + ": " + err.response.data);
        } else {
            console.log("Error: " + err.message);
        }
        return null;
    }
}


async function submitGame(apiKey, mapName, data) {
    let config = {
        headers: {
            "x-api-key": apiKey
        }
    };

    try {
        let response = await instance.post(`${BASE_PATH}/submit?MapName=${mapName}`,data, config);
        return response.data;
    } catch (err) {
        console.log(err)
        console.log("Fatal Error: could not submit the solution");
        if (err.response) {
            console.log("Error: " + err.response.message + ": " + err.response.data);
        } else {
            console.log("Error: " + err.message);
        }
        return null;
    }
}

module.exports = {
    getMap,
    submitGame
}

