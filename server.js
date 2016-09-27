// read cf-env from local file VCAP_SERVICES.json or from CF Environment in Bluemix
// http://blog.ibmjstart.net/2015/08/31/abstracting-out-environment-variables-for-bluemix/
var vcapServices = require('./vcapservices.js');

var express = require('express'),
    cors = require('cors'),
    bodyParser = require("body-parser"),
    extend    = require('util')._extend,
    fs = require('fs'),
    cookieParser = require('cookie-parser'),
    Client = require('node-rest-client').Client,
    utils = require('./utils'),
    env = require('node-env-file');
    ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');
    LanguageTranslatorV2 = require('watson-developer-cloud/language-translator/v2');

// source local environment variables from .env files
env(__dirname + '/.env', {overwrite: true, raise: false});

// IBM Push Notifications
// You can find these by clicking Show Credentials under IBM Push Notifications in your mobile backend dashboard.
// set this variables in Bluemix for your app as User Defined Environment Variables
// set this variables in your .env file when testing locally
// you should use the https url to keep your appSecret secret!
var IBMPushNotifications_url = process.env.IBMPushNotifications_url;
var IBMPushNotifications_appSecret = process.env.IBMPushNotifications_appSecret;

//Get Credentials for Watson services.
var language_translator = new LanguageTranslatorV2({
  username: vcapServices.language_translation[0].credentials.username,
  password: vcapServices.language_translation[0].credentials.password,
  url: vcapServices.language_translation[0].credentials.url,
});

var toneAnalyzer = new ToneAnalyzerV3({
  version_date: '2016-05-19',
  username: vcapServices.tone_analyzer[0].credentials.username,
  password: vcapServices.tone_analyzer[0].credentials.password,
});

var client = new Client();
var app = express();
app.use(cookieParser());
app.use(cors());
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
var server = require('http').Server(app);
var io = require('socket.io')(server);

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
    console.log(IBMPushNotifications_url);
    console.log(IBMPushNotifications_appSecret);

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
            "appSecret":IBMPushNotifications_appSecret
        }
    };

    client.post(IBMPushNotifications_url + "/messages", args, function (data, response) {
        console.log("notification sent!");
    });
    res.end("OK");
});

function serveStaticContent(req, res, next){
    console.log((new Date()).toJSON());
    return express.static('public');
}

//Analyze the tone of the message
function toneAnalyze(dataJSON){
  toneAnalyzer.tone({
    'text': dataJSON.feedback,
    language: 'en' }, function(err, data) {
      if (err) console.log("Tone Analyzer Error ", err);
      else {
        console.log("CHILDREN: " , data.document_tone.tone_categories[0].tones);
        var emotion = data.document_tone.tone_categories[0].tones;
        for (x in emotion) {
          console.log("xxxxx");
          console.log(emotion[x]);
          //dataJSON[emotion[x].tone_name] = (parseFloat(emotion[x].score)*100).toFixed(0);
          dataJSON[emotion[x].tone_name] = (emotion[x].score*100).toFixed();
        }

        //Anger vs Disgust...whichever is bigger = Anger
        dataJSON.Anger = Math.max(parseFloat(dataJSON.Anger) , parseFloat(dataJSON.Disgust));
        var smallest = Math.min(dataJSON.Joy, dataJSON.Sadness, dataJSON.Anger);
        dataJSON.Joy = dataJSON.Joy -smallest;
        dataJSON.Sadness = dataJSON.Sadness -smallest;
        dataJSON.Anger = dataJSON.Anger -smallest;


        dataJSON["summary"]= [dataJSON.Joy, dataJSON.Sadness, dataJSON.Anger ];
        db.push(dataJSON);
        io.emit('feedback', dataJSON);
        console.log(db);
      }
    });
}

//Translate the message
function translateFeedback(dataJSON, callback){
    language_translator.identify({
      text: dataJSON.feedback
    }, function (err, language) {
        if (err){
          console.log('Translate error:', err);
        } else{
            if(language.languages[0].language == 'es' || language.languages[0].language == 'fr'){
                language_translation.translate({
                    text: dataJSON.feedback, source : language.languages[0].language, target: 'en' },
                  function (err, translation) {
                    if (err) console.log('error:', err);
                    else{

                      dataJSON.sourceFeedback = dataJSON.feedback;
                      dataJSON.sourceLanguage = language.languages[0].language;
                      dataJSON.feedback = translation.translations[0].translation;
                      callback(dataJSON);
                    }
                });
            } else{
              callback(dataJSON)
            }
        }
    });
}

var port = process.env.PORT || 3001;
server.listen(port);
console.log("localhost:" + port);
