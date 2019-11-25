/*
Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License"). You may not use this file
except in compliance with the License. A copy of the License is located at

http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed on an "AS IS"
BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the
License for the specific language governing permissions and limitations under the License.
*/

var Promise=require('bluebird')
var aws=require('./aws')
var lex=new aws.LexModelBuildingService()

module.exports=function run(fnc,params){
    console.log(fnc+':request:'+JSON.stringify(params,null,3))
    return new Promise(function(res,rej){
        var next=function(count){
            console.log("tries-left:"+count)
            var request=lex[fnc](params)
            request.promise()
            .tap(x=>console.log(fnc+':result:'+JSON.stringify(x,null,3)))
            .then(res)
            .catch(function(err){
                console.log(fnc+':'+err.code)
                var retry = err.retryDelay || 5
                console.log("retry in "+retry)

                if(err.code==="ConflictException"){
                    count===0 ? rej("Error") : setTimeout(()=>next(--count),retry*1000)
                }else if(err.code==="ResourceInUseException"){
                    count===0 ? rej("Error") : setTimeout(()=>next(--count),retry*1000)
                }else if(err.code==="LimitExceededException"){
                    setTimeout(()=>next(count),retry*1000)
                }else{
                    rej(err.code+':'+err.message)
                }
            })
        }
        next(200)
    })
}
