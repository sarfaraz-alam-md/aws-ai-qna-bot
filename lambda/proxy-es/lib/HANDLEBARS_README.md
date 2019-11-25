# Handlebars

## Simple example

QnABot now lets you use [Handlebars](https://handlebarsjs.com/) templates in your answers, including the Markdown and SSML fields, so you can include variable substitution and conditional elements. Let's try a simple example to illustrate the concept:

1. Log in to the Content Designer, and choose **Add**.
1. Enter ID: *Handlebars.001*
1. Enter question: *What is my interaction count?*
1. Enter answer: *So far, you have interacted with me {{UserInfo.InteractionCount}} times.*
1. Save the new item.
1. Use the Web UI, or any Alexa device to say “*What is my interaction count?*” to your bot, and listen to it respond. 
1. Ask a few more questions, and then ask “*What is my interaction count?*” again. Notice that the value has increased.
1. In Content designer, edit item Handlebars.001
1. Modify answer to:      
   _So far, you have interacted with me {{UserInfo.InteractionCount}} times.   
   {{#ifCond UserInfo.TimeSinceLastInteraction '>' 60}}   
      It's over a minute since I heard from you last.. I almost fell asleep!   
   {{else}}   
      Keep those questions coming fast.. It's been {{UserInfo.TimeSinceLastInteraction}} seconds since your last interaction.   
   {{/ifCond}}_   
1. Use the Web UI, or Alexa, to interact with the bot again. Wait over a minute between interactions and observe the conditional answer in action.

## Available variables (handlebars context)
QnABot exposes the following content to the Handlebars context:

|Context Variable                  | Notes                                                                                          |
|----------------------------------|------------------------------------------------------------------------------------------------|
|LexOrAlexa                        | Indicates if QnABot access method is LEX or ALEXA
|UserInfo.UserId                   | Lex or Alexa user id set by client (For Twilio SMS, UserId is the user's phone number) |
|UserInfo.InteractionCount         | Accumulating interaction count for UserId (not including current interaction) |
|UserInfo.FirstSeen                | Date and time of user's first interaction with QnABot |
|UserInfo.LastSeen                 | Date and time of user's most recent previous interaction with QnABot |
|UserInfo.TimeSinceLastInteraction | Number of seconds between current and previous interaction (seconds since epoch for first interaction) |
|UserInfo.UserName                 | UserName: Authenticated users only - from token in session attribute 'accesstokenjwt' |
|UserInfo.GivenName                | Given Name: Authenticated users only - from token in session attribute 'accesstokenjwt' |
|UserInfo.FamilyName               | Family Name: Authenticated users only - from token in session attribute 'accesstokenjwt' |
|UserInfo.Email                    | Email address: Authenticated users only - from token in session attribute 'accesstokenjwt' |
|UserInfo.isVerifiedIdentity       | true or false: Authenticated users only - verifies if token is signed by key in jwks from trusted identity provider per QnABot setting IDENTITY\_PROVIDER\_JWKS\_URLS |
|SessionAttributes._name_          | all session attributes are available to the handlebars context |

## Helpers
You can use any [built-in handlerbars helpers](https://handlebarsjs.com/builtin_helpers.html).  
QnABot also provides these additional helpers:

|Helper                  | Descr                                      | Example                                                                                     |
|------------------------|--------------------------------------------|---------------------------------------------------------------------------------------------|
|ifCond                  | Block helper for conditional output.<br>Supported comparison operators:<br>'==', '===', '!=' ,'!==', '<', '<=', '>', '>=', '&&','&#124;&#124;' |{{#ifCond LexOrAlexa '==' 'LEX'}}<br>_output if true_<br>{{else}}<br>_output if false_<br>{{/ifCond}}<br> |
|setSessionAttr          | Sets a named session attribute to specified value. | {{setSessionAttr '_testAttrName_' '_value_'}} |
|randomPick              | Randomly return a string selected from a list. | {{randomPick<br>"Greetings."<br>"Hi there!"<br>"Howdy"<br>"Hello, how are you?"<br>"Whassup dude!"<br>}}|

## Comments
Use the handlebars comment syntax to make your handlebars easier to understand..
  
{{!-- comment --}}

## Examples  

```
{{!-- respond with users name if known --}}
{{#if UserInfo.GivenName}}
   Greetings {{UserInfo.GivenName}}! 
{{else}}
   Greetings friendly human! 
{{/if}}

{{!-- Conditional welcome back message --}}
{{#ifCond UserInfo.TimeSinceLastInteraction '>' 3600}}
   You've been gone for a while. I missed you!
{{/ifCond}}
Ask me a question. Try to stump me. 

{{!-- check and set session Attribute --}}
{{#if SessionAttributes.testAttr}}
   Session Attribute "testAttr" is already set: {{SessionAttributes.testAttr}}
{{else}}
   Setting Session Attribute "testAttr" 
   {{setSessionAttr 'testAttr' 'BobRocks'}}
   Done
{{/if}}

{{!-- pick a random answer from list below --}}
{{randomPick 
"Greetings." 
"Hi there!" 
"Howdy"
"Hello, how are you?"
"Whassup dude!"
}}
```

