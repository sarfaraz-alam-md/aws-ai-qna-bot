var base=require('./base')
var Promise=require('bluebird')
var aws=require('../../lib/util/aws')
var s3=new aws.S3()
var JSZip = require("jszip");
var outputs=require('../../../../bin/exports')

var setup=outputs('dev/bucket').then(function(output){
    var zip=new JSZip()
    var param={
        SrcBucket:output.Bucket,
        Key:"test.zip",
        DstBucket:output.Bucket
    }
    
    zip.file('hello.txt',"hello world")
    zip.file('folder/hello.txt',"hello world")
    zip.file('index.html',"hello world")
    zip.file('style.css',"hello world")
    
    return Promise.resolve(zip.generateAsync({type:'nodebuffer'}))
    .then(function(buff){
        return s3.putObject({
            Bucket:param.SrcBucket,
            Key:param.Key,
            Body:buff
        }).promise()
    })
    .return(param)
})

exports.create=()=>params("Create")
exports.update=()=>params("Update")
exports.delete=()=>params("Delete")

function params(stage){
    return setup.then(param=>base("S3Unzip",stage,param))
}
