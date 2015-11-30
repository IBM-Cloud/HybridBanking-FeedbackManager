
//FILL THESE OUT WITH YOUR OWN VALUES. (You can also provide a .env file or use environment variables)
//You can find these by clicking Show Credentials under IBM Push Notificaitons in your mobile backend dashboard.
process.env.IBMPushNotifications_url = "IBM_PUSH_NOTIFICATION_URL";
process.env.IBMPushNotifications_appSecret  = "IBM_PUSH_NOTOFICATION_SECRET";

var express = require('express'),
    cors = require('cors'),
    bodyParser = require("body-parser"),
    bluemix   = require('./config/bluemix'),
    extend    = require('util')._extend,
    watson = require('watson-developer-cloud'),
    fs = require('fs'),
    cookieParser = require('cookie-parser'),
    Client = require('node-rest-client').Client,
    utils = require('./utils'),
    env = require('node-env-file');

 env(__dirname + '/.env', {overwrite: true, raise: false});

console.log("process.env.IBMPushNotifications_url: " + process.env.IBMPushNotifications_url);
var client = new Client();
var app = express();
app.use(cookieParser());
app.use(cors());
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

var db = [];

function seedDB(){ //TODO: Add Cloudant
    db = JSON.parse(fs.readFileSync('initdb.json', 'utf8'));
}
seedDB();

app.get('/', function(req, res, next){
    next();
});
app.use('/', serveStaticContent());

app.post('/submitFeedback',function(req,res){
  var user_name=utils.cleanUserName(req.body.user);
  var feedback=req.body.feedback;
  console.log("User name = "+user_name+", feedback is "+feedback);
  var data = {"id": db.length, user:user_name, "feedback":feedback, status: "Platinum", worth: "$32k"};
  translateFeedback(data, function(dataJSON){toneAnalyze(dataJSON)});
  res.end("OK");
});

app.get('/getAllData', function(req, res){
        res.json(db);   
});

app.get('/init', function(req, res){
    seedDB();
    res.cookie('bar', 'baz');
    res.redirect('/'); 
});

//Send Push notification to users by calling Mobile Backend Push Notificaiton API
app.post('/award', function(req, res){
    console.log("awarding customer");
    //Default notification to send to user.
    var notificationMessage = "I'm sorry! I gave you 500 free points.";
    if(req.body.message) notificationMessage = req.body.message;
    
    var args = {
        data: {
          "message": {
            "alert": notificationMessage,
            "url": ""
          }
        },
        headers: {
            "Content-Type": "application/json",
            "appSecret":process.env.IBMPushNotifications_appSecret
        }
    };

    client.post(process.env.IBMPushNotifications_url + "/messages", args, function (data, response) {
        console.log("notification sent!");
    });
    res.end("OK");
});

function serveStaticContent(req, res, next){
    console.log((new Date()).toJSON());
    return express.static('public');
}

//Get Credentials for Watson services. 
var TAcredentials = extend({
  version: 'v2',
  username: 'a468c26a-85e8-4e83-b75f-12d2ef321e39', //when running locally
  password: 'g52EKZfV8WtT'
}, bluemix.getServiceCreds('tone_analyzer'));  // running on Cloud: VCAP_SERVICES
var toneAnalyzer = watson.tone_analyzer(TAcredentials);

var LTcredentials =  extend({
  username: '4f1c9b5d-ef63-48bb-a2ea-627f16a0614c', //when running locally
  password: 'pymQX8qZyGoQ',
  version: 'v2'
}, bluemix.getServiceCreds('language-translation')); // running on Cloud: VCAP_SERVICES
var language_translation = watson.language_translation(LTcredentials);

//Analyze the tone of the message
function toneAnalyze(dataJSON){
  toneAnalyzer.tone({
    'text': dataJSON.feedback,
    language: 'en' }, function(err, data) {
      if (err) console.log(err);
      else {
        var emotion = data.children[0].children;
        for (x in emotion) {
          dataJSON[emotion[x].name] = (parseFloat(emotion[x].raw_score)*1000).toFixed(0);;
        }
        dataJSON["summary"]= [dataJSON.Cheerfulness, dataJSON.Negative, dataJSON.Anger ];
        db.push(dataJSON);
        console.log(db);
      }
    });
}

//Translate the message
function translateFeedback(dataJSON, callback){
    language_translation.identify({
      text: dataJSON.feedback 
    }, function (err, language) {
        if (err){
          console.log('error:', err);
        } else{
            if(language.languages[0].language == 'es' || language.languages[0].language == 'fr'){
                language_translation.translate({
                    text: dataJSON.feedback, source : language.languages[0].language, target: 'en' },
                  function (err, translation) {
                    if (err) console.log('error:', err);
                    else{
                      dataJSON.feedback = translation.translations[0].translation + " [translated from "+language.languages[0].language+"]";
                      callback(dataJSON);
                    }
                });
            } else{
              callback(dataJSON)
            }
        }
    });
}

app.listen(process.env.PORT || 3001);
