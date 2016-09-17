"use strict";

const path = require('path');
var mime = require('mime');
var conf = require('./conf.json');
var AWS = require('aws-promised');
var fs = require('fs-extra-promise');
var stats = require('udp_stats').configure({
    mode: "udp",
    host: "ec2-54-165-139-237.compute-1.amazonaws.com",
    port: 8125,
    type: "count",
    metricName: "aws.s3.upload"
});

var s3 = new AWS.s3({useAccelerateEndpoint: true});

var droppedConnections = 0;

function main() {

    let startTime = 0;
    let stopTime = 0;

    console.log("BEGIN");

    new Promise(function(resolve, reject){

        let fileList = [];

        fs.walk(conf.directory)
            .on('data', function (file) {

                if (new RegExp(conf.fileFilter, 'i').test(file.path))
                    fileList.push(file.path);
                else
                    console.warn(`IGNORE: ${file.path}`);

            })
            .on('end', function(){resolve(fileList);})
            .on('error', reject);
    })
    .then(function(fileList){

        console.log(`discovered ${fileList.length} files`);

        startTime = stats.start();
        return groupUpload(fileList, conf.concurrentUploads);
    }).then(function(){

        stopTime = stats.stop();
        console.log(`done!\n\n ${startTime}-${stopTime}=${startTime-stopTime} with ${droppedConnections} dropped`);

    }).catch(console.error);
}

function groupUpload(fileList, groupSize){

    if(!fileList.length)
        return Promise.resolve();

    return new Promise(function(resolve, reject){

        let returnCount = 0;

        groupSize = Math.min(groupSize, fileList.length);

        fileList.slice(0, groupSize).forEach(function(filePath){
            let fileName = path.win32.basename(filePath);
            let body = fs.createReadStream(filePath);
            body.read();

            var params = {
                Bucket: conf.bucketName,
                Key: fileName,
                ContentType: mime.lookup(fileName),
                Body: body
            };

            s3.makeUnauthenticatedRequest('putObject', params, function (err, result) {

                if (err){
                    droppedConnections++;
                    console.error(err);
                } else {

                    stats.send(1).then(function(){
                        console.log("STATS: +1");
                    });
                }

                if(++returnCount === groupSize){
                    console.log(`${fileList.length-groupSize} left!`);
                    resolve(groupUpload(fileList.slice(groupSize), groupSize));
                }
            });
        });
    });
}


main();