/*
Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License"). You may not use this file
except in compliance with the License. A copy of the License is located at

http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed on an "AS IS"
BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the
License for the specific language governing permissions and limitations under the License.
*/

var aws=require('aws-sdk')
var cfnLambda=require('cfn-lambda')
var Promise=require('bluebird')
aws.config.region=process.env.REGION
aws.config.setPromisesDependency(Promise)
var lex=new aws.LexModelBuildingService()
var iam=new aws.IAM()

function makeid(prefix){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    for( var i=0; i < 5; i++ )
    text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text
}

function id(length){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    for( var i=0; i < length; i++ )
    text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text
}

function clean(name){
    var map={
        '0':'zero',
        '1':'one',
        '2':'two',
        '3':'three',
        '4':'four',
        '5':'five',
        '6':'six',
        '7':'seven',
        '8':'eight',
        '9':'nine',
        '-':'_',
    }
    var out=name.replace(/([0-9])/g,x=>map[x])
    out=out.replace(/-/g,'_')
    console.log(out)
    return out
}

function run(fnc,params){
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
                }else if(err.code==="AccessDeniedException"){
                    setTimeout(()=>next(count),retry*1000)
                }else{
                    rej(err.code+':'+err.message)
                }
            })
        }
        next(10)
    })
}


class Lex {
    constructor(type){
        this.type=type
        this.create_method='put'+type
        this.delete_method='delete'+type
        this.get_method="get"+type
    }
    checksum(id){
        return lex[this.get_method]({
            name:id,
            version:"$LATEST"
        }).promise().get("checksum")
    }
    name(params){
        var name=params.name ? clean(params.name) : this.type+makeid()
        name=params.prefix ? [params.prefix,name].join('_') : name;
        return name.slice(0,28)+id(2)
    }

    Create(params,reply){
        var self=this
        params.name=this.name(params)
        delete params.prefix
    
        if(params.childDirected){
            params.childDirected={"false":false,"true":true}[params.childDirected]
        }
        if(this.type==='Bot'){
            var start=iam.createServiceLinkedRole({
                AWSServiceName: 'lex.amazonaws.com',
                Description: 'Service linked role for lex'
            }).promise()
            .tap(console.log)
            .catch(console.log)
        }else{
            var start=Promise.resolve()
        }
        start.then(()=>run(self.create_method,params))
        .then(msg=>reply(null,msg.name,null))
        .error(reply).catch(reply)
    }

    Update(ID,params,oldparams,reply){
        var self=this
        if(this.type!=='SlotType'){
            self.Create(params,reply) 
        }else{
            reply(null,ID)
        }
    }
    
    Delete(ID,params,reply){
        var arg={name:ID}

        if(this.type==="BotAlias") arg.botName=params.botName
        
        return run(this.delete_method,arg)
        .then(msg=>reply(null,msg.name,null))
        .catch(function(error){
            console.log(error)
            if(error.indexOf("NotFoundException")!==-1){
                reply(null,ID,null)
            }else{
                reply(error)
            }
        })
    }
 }

 module.exports=Lex
