const { Console } = require("winston/lib/winston/transports");
let logger = require("./logger"),
    utils = require("./utils");
    express = require("express"),
    bodyParser = require("body-parser"),
    app = express();

app.use(utils.rateLimit);

app.get("/test", async (request, response) => {
    console.log(request.ip)
    response.status(200).send({"res": "Success Response"})
});

async function main() {
    logger.info(`Gateway service initiated...`);

    let travellersApiResponse = await utils.makeApiRequest(`http://localhost:5556/api/v1/summary/5ec3c9d20199c4049bbe3316`,"GET");
    console.log(travellersApiResponse)
}

// main();