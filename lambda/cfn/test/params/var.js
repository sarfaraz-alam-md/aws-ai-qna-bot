var base=require('./base')
var Promise=require('bluebird')

exports.create=()=>params("Create")
exports.update=()=>params("Update")
exports.delete=()=>params("Delete")

function params(stage){
    return base("Variable",stage,{
        Bytes:512,
        name:{
            value:"TEST",
            op:"toLowerCase"
        }
    })
}
