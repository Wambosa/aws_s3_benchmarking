"use strict";

var socket = {};
var port = 8125;
var host = "localhost";
var metricName = "test.buff";
var type = "count";

var startTime = 0;
var stopTime = 0;

var metricData = [];

const typeTable = {
    count: {
        symbol: "c",
        validation: /^\w+:(\d+|\d)\|c$/
    },
    sampling: {
        symbol: "c|@0.1"
    },
    timing: {
        symbol: "|ms|@0.1"
    }
};

function timeStamp(){
    return Math.floor(new Date().getTime() / 1000);
}


module.exports = {

    configure: function(options){

        if(!options)
            options = require('./scotty.json');

        port = options.port || port;
        host = options.host || host;
        type = options.type || type;
        metricName = options.metricName || metricName;

     return this;
    },

    start: function(specifiedTime) {
        socket = dgram.createSocket('udp4');
        return startTime = specifiedTime || timeStamp();
    },

    stop: function(specifiedTime){

        stopTime = specifiedTime || timeStamp();

        // todo: send anything left in metricData
        // foreach datametric socket.send(message, 0, message.length, port, host, function(){});

        socket.close();
    },

    push: function(dataPoint){
        return metricData.push({
            dataPoint: dataPoint,
            time: startTime - timeStamp()
        }) && metricData;
    },

    send: function(dataPoint, callback){
        return new Promise(function(resolve, reject){
            let msg = `${metricName}:${dataPoint}|${typeTable[type].symbol}`;
            socket.send(msg, 0, msg.length, port, host, callback || function(err){
                    if(err)reject(err);
                    else resolve();
                }
            );
        });
    }
};