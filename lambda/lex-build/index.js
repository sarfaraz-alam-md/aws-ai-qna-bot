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
var lib=require('./lib')
var aws=require('./lib/aws')
var lambda=new aws.Lambda()
var lex=new aws.LexModelBuildingService()

exports.handler=function(event,context,callback){
    console.log("Event:",JSON.stringify(event,null,2))
    
    return lib(event).then(()=>callback(null,"success"))
        .catch(callback)
}


