var AWS = require('aws-sdk');
let fs = require("fs");
let path = require("path");

AWS.config.update({region: 'us-east-1'});
var s3 = new AWS.S3();
let TLDS = undefined;

var BUCKET_NAME = process.env.BUCKET_NAME || 'www.zeer0.com';
const PSL_FILE_KEY = process.env.PSL_FILE_KEY || "mozilla-psl.dat";

const RESPONSE = {
    statusCode: 400,
    headers: {
        "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
        'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({'msg': 'no data'}),
};

let readFileAsync = async (filename) => {
    if(TLDS) {
        return TLDS;
    }
    var getParams = {
        Bucket: BUCKET_NAME,
        Key: filename
    };
    return s3.getObject(getParams)
        .promise()
        .then(data => {
            console.log("Using s3 file");
            return data.Body.toString('utf8');
        })
        .catch(e => {
            console.log(e);
            return new Promise((resolve, reject) => {
                fs.readFile(filename, 'utf8', (e, d) => {
                    if(e) return reject(e);
                    return resolve(d);
                });
            });
        });
};

exports.getTldOfDomain = async (domain) => {
    // TODO implement
    return await readFileAsync(PSL_FILE_KEY)
        .then(tlds => {
            //drop comments and empty lines
            TLDS = tlds;
            return TLDS.split('\n').filter((tld) => !(tld.match(/^\/\//, "g") || tld.match(/^$/, "g")));
        }).then((tlds) => {
            return tlds.filter((tld) => {
                let regex = new RegExp(tld.startsWith("!") ? `\\.${tld.substring(1)}$` : tld.startsWith("*.") ? `\\.${tld.substring(2)}$` : `\\.${tld}$`, "i");
                if(regex.test(domain)) return tld;
            });
        })
        .then((matchedTlds) => {
            return matchedTlds.reduce((bestMatch, matchedTld) => {
                if(matchedTld.split(".").length >= bestMatch.split(".").length) {
                    bestMatch = matchedTld;
                }
                return bestMatch;
            }, "");
        })
        .then((bestMatch) => {
            const response = {
                statusCode: 400,
                body: JSON.stringify({tld: ''}),
                headers: {
                    "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
                    'Access-Control-Allow-Credentials': true
                },
            };
            if(bestMatch){
                response.statusCode = 200;
                response.body = JSON.stringify({tld: bestMatch});
            }
            return response;
        });
};
