var _=require('lodash')
var aws=require('aws-sdk')
aws.config.region=process.env.AWS_REGION
var lambda=new aws.Lambda()
var kms=new aws.KMS()
var handlebars = require('handlebars')
var fs=require('fs')

handlebars.registerHelper('arrayPlural', function(array,singular, plural) {
    if(array.length===1){
        return singular
    }else{
        return plural
    }
})

var markdown=handlebars.compile(
    fs.readFileSync(`${__dirname}/templates/quiz-response.md`,'utf-8')
)
var text=handlebars.compile(
    fs.readFileSync(`${__dirname}/templates/quiz-response.hbs`,'utf-8')
)

exports.handler=async function(event,context,callback){
    console.log(JSON.stringify(event,null,2))
    try{
        if(event.res.session.quizBot){
            var decrypt=await kms.decrypt({
                CiphertextBlob:Buffer.from(event.res.session.quizBot,'base64'),
                EncryptionContext:{
                    userId:event.req._event.userId
                }
            }).promise()
            var quizBot=JSON.parse(decrypt.Plaintext.toString('utf8'))
        }else{
            var quizBot={
                questionCount:0,
                correctAnswerCount:0,
                next:event.res.result.args[0],
                originalDocumentQid:_.get(event,"res.session.previous.qid","")
            }
        }
        console.log(JSON.stringify(quizBot,null,2))
        var templateParams={
            first:quizBot.questionCount===0,
            message:_.get(event,"res.result.a")
        } 
        if(quizBot.prev){
            prev=await lambda.invoke({
                FunctionName:event.req._info.es.service.qid,
                InvocationType:"RequestResponse",
                Payload:JSON.stringify({qid:quizBot.prev})
            }).promise()

            prevDocument=JSON.parse(prev.Payload)
            console.log(JSON.stringify(nextDocument,null,2))
            if(!prevDocument) throw `Next Document not Found:${quizBot.prev}`

            templateParams.correctAnswers=quizBot.correctAnswers
            if(isCorrect(event.req.question,
                quizBot.correctAnswers,
                quizBot.incorrectAnswers
            )){
                templateParams.correct=true
                templateParams.message=_.get(prevDocument,"responses.correct")
                quizBot.correctAnswerCount++
            }else{
                templateParams.incorrect=true
                templateParams.message=_.get(prevDocument,"responses.incorrect")
            }
        }
        
        if(quizBot.next){
            result=await lambda.invoke({
                FunctionName:event.req._info.es.service.qid,
                InvocationType:"RequestResponse",
                Payload:JSON.stringify({qid:quizBot.next})
            }).promise()

            nextDocument=JSON.parse(result.Payload)
            console.log(JSON.stringify(nextDocument,null,2))
            if(!nextDocument) throw `Next Document not Found:${quizBot.next}` 

            templateParams.question=nextDocument.question 
            templateParams.answers=_.shuffle(
                nextDocument.incorrectAnswers.map(answer=>[answer,false])
                .concat(
                    nextDocument.correctAnswers.map(answer=>[answer,true])
                ))
                .map((val,index)=>{
                    val[2]=String.fromCharCode(65+index)
                    return val
                })
            
            quizBot.correctAnswers=templateParams.answers
                .filter(x=>x[1]).map(x=>x[2])
            quizBot.incorrectAnswers=templateParams.answers
                .filter(x=>!x[1]).map(x=>x[2])

            event.res.session.queryLambda=process.env.AWS_LAMBDA_FUNCTION_NAME
            quizBot.questionCount++
            quizBot.prev=quizBot.next
            quizBot.next=_.get(nextDocument,"next[0]",false)
          
            var encrypt=await kms.encrypt({
                KeyId:process.env.QUIZ_KMS_KEY,
                Plaintext:JSON.stringify(quizBot),
                EncryptionContext:{ 
                    userId:event.req._event.userId
                }
            }).promise()
            console.log(encrypt)

            event.res.session.quizBot=encrypt.CiphertextBlob.toString('base64')
            if(_.get(nextDocument,"r.imageUrl")){
                event.res.card=nextDocument.r
                event.res.card.send=true
            }
        }else{
            templateParams.finished=true
            templateParams.totalCorrect=quizBot.correctAnswerCount
            templateParams.totalQuestions=quizBot.questionCount
            templateParams.message=_.get(prevDocument,"responses.incorrect")
            templateParams.endmessage=_.get(
                prevDocument,"responses.end","Thank you for taking the quiz!")
            var score=quizBot.correctAnswerCount/quizBot.questionCount*100
            templateParams.score=Math.round(score)
            templateParams.success=templateParams.score > 50 ? true : false
            clear(event)
        }
        render(event,templateParams)
    }catch(e){
        if(e==="exit"){
            var params={
                exit:true
            }
            clear(event)
            render(event,params) 
        }else if(e==="InvalidAnswer"){
            var params={
                invalid:true,
                answers:quizBot.correctAnswers
                    .concat(quizBot.incorrectAnswers)
                    .sort()
            }
            render(event,params) 
        }else{
            console.log("Failed",e)
            clear(event)
            event.message="Sorry, Failed to process quiz"
        }
    }finally{
        console.log(JSON.stringify(event,null,2))
        callback(null,event)
    }
}
function render(event,params){
    event.res.message=text(params)
        .replace(/\r?\n|\r/g, " ").replace(/ +(?= )/g,'');
    _.set(event,
        "res.session.appContext.altMessages.markdown",
        markdown(params)
    )
}

function clear(event){
    delete event.res.session.quizBot
    delete event.res.session.queryLambda
}

function isCorrect(response,correct,incorrect){
    var response_standard=standardize(response)
    if(["QUIT","EXIT"].includes(response_standard)){
        throw "exit"
    }else{
        if(correct.includes(response_standard)){
            return true
        }else if(incorrect.includes(response_standard)){
            return false
        }else{
            throw "InvalidAnswer"
        }
    }
}

function standardize(str){
    return str.toUpperCase().trim().replace(/[^\w\s]|_/g, "")
}


