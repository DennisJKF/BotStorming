

var ideas=new Array();
var idea_count=0;
var natural = require('natural'),
    TfIdf = natural.TfIdf;
var wordnet = new natural.WordNet();
var tokenizer = new natural.WordTokenizer();

var emotionScore = 0;
var EMOTION_SCORE_THRESHOLD = 5;

var RELAVANT_SENTENCE_THRESHOLD = 0.7;

var MAX_DISCUSSION_KEYWORD_NUM = 5;

var speak = require("speakeasy-nlp");

var CHEER_UP_WORD = new Array();

var stage = "uninit"; // => brainstorm => discuss => vote
var discussions = "";

var joinedUsers = new Array();

var votedUsers = new Array();

var hasPost = false;

let BRAINSTORM_TIME = 1000*60;
let DISCUSS_TIME = 1000*60*2;
let VOTE_TIME = 1000*30;
let NOTIFY_INTERVAL = 1000*15;
var voteResult = new Array();
Array.prototype.contains = function(obj) {
  var i = this.length;
  while(i--) {
    if(this[i] === obj) {
      return true;
    }
  }
  return false;
};

function getIdeas(){
  var content = "**Ideas is as below:**\n";
  var i = 0;
  for(var i=0;i<idea_count;i++){
    content += "idea "+(i+1)+":\t"+ideas[i]+"\n"
  }
  return content;
};

function getDiscussionResult(){
  var content = "**Discussion Keywords:**\n";
  var i = 0;
  console.log(discussions);
  tfidf = new TfIdf();
    tfidf.addDocument(discussions);
    var items=tfidf.listTerms(0);
    for(i=0;i<MAX_DISCUSSION_KEYWORD_NUM&&i<items.length&&items[i].tfidf>0.5;i++){
      content+="**"+(items[i].term)+"**\n";
      console.log(items[i].term+" : "+items[i].tfidf);
    }
  return content;
};

module.exports = (robot) => {
    robot.respond(/start\s+([\s\S]+)$/, (res) => {
    if(stage != "uninit") {
      return;
    }

//
 ideas=new Array();
 idea_count=0;

 emotionScore = 0;

 CHEER_UP_WORD = new Array();

 stage = "uninit"; // => brainstorm => discuss => vote
 discussions = "";

 joinedUsers = new Array();

 votedUsers = new Array();

 hasPost = false;
 voteResult = new Array();

//

    let topic = res.match[1];
    res.send("**The topic is about:** " + topic + "\n**Any Good Ideas? You have 1 minute.**");
    stage = "brainstorm";

    setInterval(function(){
      if(hasPost) {
        hasPost = false;
      }
      else{
      if(stage == "brainstorm") {
        res.send('**More ideas!**');
      }
      else if(stage == "discuss") {
        res.send('**Let us know your opinion!!**');
      }
      else if(stage == "vote") {
        res.send("**Don't forget to vote!**");
      }
      }

    }, NOTIFY_INTERVAL);

    setTimeout(function(){
      stage = "discuss";
      res.send(getIdeas());
      res.send("**Now it is discussion stage. You have 2 minutes.**\n");
      //
      setTimeout(function(){
          stage = "vote";
          res.send(getDiscussionResult());
          res.send(getIdeas());
          res.send("**Now its time to vote. You have 30 seconds.**");
          for(let i = 0; i < idea_count; i++) {
            voteResult[i] = 0;
          }
          //
          setTimeout(function(){
            stage = "uninit";
            res.send("**Now voting is ended. **\n")
            var output = "**Below is the voting result:**\n";
            for (let i = 0; i < idea_count; i++) {
                output += '\n' + (i + 1) + ': ' + ideas[i] + ' ' + voteResult[i] + ' \n';
            }
            res.send(output);
          }, VOTE_TIME);
          //
      }, DISCUSS_TIME);
      //
    }, BRAINSTORM_TIME);
  })

  robot.respond(/vote\s+(\d+)$/, (res) => {
    if(stage != 'vote')
    {
      return;
    }
    hasPost = true;
    let name = res.envelope.user.name;
    if(votedUsers.contains(name) == true) {
      return;
    }
    votedUsers.push(name);
    var voteId = parseInt(res.match[1]);
    voteResult[voteId-1] = voteResult[voteId-1] + 1;
    res.send(ideas[voteId-1])
  })

  robot.hear(/[\s\S]+/,(res) => {
    let text = res.match[0];
    console.log(speak.sentiment.analyze(text));
    if(text.indexOf('**') == 0 || text.indexOf('bs') == 0) {
      return;
    }

    hasPost = true;

    if(stage == 'discuss') {
      res.send(dealWithWordEmotion(text));
      discussions+=res.match[0] + '\n';
    }
    else if(stage == 'brainstorm') {
      var i;
      var relevance;
      for(i=0;i<idea_count;i++){
        if(isRelative(ideas[i],res.match[0])){
          res.send("**The idea : "+res.match[0]+" and idea :"+ideas[i]+" is similar. They are merged.**")
          break;
        }
      }
      if(i==idea_count){
        ideas[idea_count++] = res.match[0];
      }
    }
  });

  function getNegetiveMoto(){
    return "Cheer up! We can figure it out!";
  }

  function getPositiveMoto(){
    return "Good point!";
  }

  function dealWithWordEmotion(param){
    var analyze = speak.sentiment.analyze(param);
    emotionScore = emotionScore+analyze.score;
    if(emotionScore<-EMOTION_SCORE_THRESHOLD){
      emotionScore = 0;
      return "**"+getNegetiveMoto()+"**\n";
    }else if(emotionScore > EMOTION_SCORE_THRESHOLD){
      emotionScore = 0;
      return "**"+getPositiveMoto()+"**\n";
    }
  }

  function isRelative(param1,param2) {
    var distance = parseFloat(natural.JaroWinklerDistance(param2,param1));
    console.log(param1+";"+param2+";"+distance)
    if(distance > RELAVANT_SENTENCE_THRESHOLD){
      return true;
    }else {
      return false;
    }
  }
}