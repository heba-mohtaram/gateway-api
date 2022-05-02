let axios = require('axios');
let logger = require("./logger");
let moment = require('moment');
let redis = require('redis');

const redisClient = redis.createClient({port: "", host: ""});
const WINDOW_SIZE_IN_MINS = 5;
const MAX_WINDOW_REQUEST_COUNT = 1;
const WINDOW_LOG_INTERVAL_IN_HOURS = 1;

module.exports.makeApiRequest = (url, method, body = null) => {
    return new Promise(resolve => {
        if (body) {
            logger.info(`Request Body --> ${JSON.stringify(body)}`);
        }
        return axios({
            method: method,
            url: url,
            data: body
        }).then(response => {
            logger.info(`${response.status} <-- ${JSON.stringify(response.data)}`);
            if (response.status === 200) {
                resolve(response.data);
            } else {
                logger.info(`${response.status} <-- ${JSON.stringify(response.data)}`);
                resolve(false);
            }
        }).catch(error => {
            logger.error(`${error.response.status} <--  ${JSON.stringify(error.response)}`);
            resolve(false);
        });
        
    });
};

//  Limit the API requests to 1 per IP every 5 minutes
module.exports.rateLimit = (req, res, next) => {
    try {
      if (!redisClient) {
        throw new Error('Redis client does not exist!');
        process.exit(1);
      }

      redisClient.get(req.ip, function(err, record) {
        if (err) throw err;
        const currentRequestTime = moment();
       
        //first time record should be saved in redis
        if (record == null) {
          let newRecord = [];
          let requestLog = {
            requestTimeStamp: currentRequestTime.unix(),
            requestCount: 1
          };
          newRecord.push(requestLog);
          redisClient.set(req.ip, JSON.stringify(newRecord));
          next();
        }

        //if record exists
        let data = JSON.parse(record);
        let windowStartTimestamp = moment()
          .subtract(WINDOW_SIZE_IN_MINS, 'minutes')
          .unix();
        let requestsWithinWindow = data.filter(entry => {
          return entry.requestTimeStamp > windowStartTimestamp;
        });

        
        let totalWindowRequestsCount = requestsWithinWindow.reduce((accumulator, entry) => {
          return accumulator + entry.requestCount;
        }, 0);

        //if number of request exceeds
        if (totalWindowRequestsCount >= MAX_WINDOW_REQUEST_COUNT) {
          res
            .status(400)
            .jsend.error(
              `You have exceeded the ${MAX_WINDOW_REQUEST_COUNT} requests in ${WINDOW_SIZE_IN_MINS} mins limit!`
            );
        } else {

          let lastRequestLog = data[data.length - 1],
            potentialCurrentWindowIntervalStartTimeStamp = currentRequestTime.subtract(WINDOW_LOG_INTERVAL_IN_HOURS, 'hours').unix();

          if (lastRequestLog.requestTimeStamp > potentialCurrentWindowIntervalStartTimeStamp) {
            lastRequestLog.requestCount++;
            data[data.length - 1] = lastRequestLog;
          } else {
           
            data.push({
              requestTimeStamp: currentRequestTime.unix(),
              requestCount: 1
            });
          }
          redisClient.set(req.ip, JSON.stringify(data));
          next();
        }
      });
    } catch (error) {
      next(error);
    }
};