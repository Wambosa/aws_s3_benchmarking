"use strict";

var stats = require('./scotty');
var conf = require('./conf.json');
var AWS = require('aws-promised');
var fs = require('fs-extra-promise');

var s3 = new AWS.s3();


function main() {

    console.log("BEGIN");

    fs.walk(conf.directory)
        .on('data', function (file) {

            if (/\.jpg$/.test(file.path)) {

                let fileName = file.path
                    .replace(/\\/g, '/')
                    .replace(new RegExp(`${conf.directory}\/|${conf.directory}`, "i"), '');

                console.log(`READ: ${file.path}`);
                let body = fs.createReadStream(file.path);
                body.read();

                var params = {
                    Bucket: conf.bucketName,
                    Key: fileName,
                    ContentType: getContentType(file),
                    Body: body
                };

                s3.makeUnauthenticatedRequest('putObject', params, function (err, result) {

                    console.log("AWSCALLBACK: "+!!err);
                    if (err){
                        console.error(err);
                    } else {
                        stats.send(1);
                        console.log("STATS: +1");
                    }
                });
            }else{console.warn(`IGNORE: ${file.path}`)}
        })
        .on('error', console.error);
}

function getContentType(fileName){

    let fileTypes = [
        {ext: 'js', contentType: 'application/x-javascript'},
        {ext: 'html', contentType: 'text/html'},
        {ext: 'css', contentType: 'text/css'},
        {ext: 'txt', contentType: 'text/plain'},
        {ext: 'log', contentType: 'text/plain'},
        {ext: 'png', contentType: 'image/png'},
        {ext: 'jpeg', contentType: 'image/jpeg'},
        {ext: 'jpg', contentType: 'image/jpeg'},
        {ext: 'gif', contentType: 'image/gif'},
        {ext: 'tiff', contentType: 'image/tiff'},
        {ext: 'zip', contentType: 'application/zip'},
        {ext: 'mpeg', contentType: 'application/mpeg'},
        {ext: 'mp3', contentType: 'application/mpeg'}
    ];

    let search = fileTypes.find(function(fileType) {
        return new RegExp(`^.*\.${fileType.ext}$`, 'i').test(fileName);
    });

    search = search || {contentType: 'application/octet-stream'};

    return search.contentType;
}


main();