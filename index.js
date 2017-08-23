'use strict';
const inquirer = require('inquirer');
const vindexer = require("video-indexer");
var Vindexer, owner, videoResult, insightResult, selectedid;

const optionsPrompt = {
  type: 'list',
  name: 'options',
  message: 'Make a selection from the options below.',
  choices: ['Upload new video', 'View/edit my video insights']
};

const apikey = {
  type: 'input',
  name: 'apikey',
  message: 'Enter your Video IndexerAPI key:',
}

const newvideo = [{
  type: 'input',
  name: 'newvideourl',
  message: 'Enter the URL of the video you want to upload:'
}, {
  type: 'input',
  name: 'newvideoname',
  message: 'Enter the name of the video:'
}, {
  type: 'confirm',
  name: 'newvideoprivate',
  message: 'Keep uploaded video private?'
}];

const myinsights = {
  type: 'list',
  name: 'myinsights',
  message: 'Select a video to view insights or delete',
  choices: ["|-----------------GO BACK----------------|"]
};

const videoactions = {
  type: 'list',
  name: 'options',
  message: 'Make a selection from the options below.',
  choices: ['Get keywords', 'Get sentiment scores', 'Get insights widget URL', 'Get player widget URL', 'Get subtitles URL', 'Delete video', 'Delete video and insights']
};


main();

function main() {
  console.log('\nWelcome to vicli, the Video Indexer Command Line Interface app!\n\n');
  enterAPIKey();
}

function enterAPIKey() {
  inquirer.prompt(apikey).then(function (answer) {
    console.log(answer.apikey);
    Vindexer = new vindexer(answer.apikey);
    Vindexer.getAccounts().then(function (result) {
      let apiresult = JSON.parse(result.body);
      if (result.statusCode <= 202) {
        let owner = apiresult[0].name;
        console.log(`\nSuccessfully logged in as ${owner}!\n`);
        mainMenu();
      }
      else {
        console.log(`\nSomething went wrong! Check your API key and try again. \nError message: ${apiresult.message}\n`);
        enterAPIKey();
      }
    });
  });
}

function mainMenu() {
  inquirer.prompt(optionsPrompt).then(function (answers) {
    if (answers.options === 'Upload new video') {
      uploadVideo();
    }
    if (answers.options === 'View/edit my video insights') {
      viewInsights();
    }
    else { }
  });
}

function uploadVideo() {
  inquirer.prompt(newvideo).then(function (answers) {
    console.log(`\nPlease wait...`);
    let privacystring = "Private";
    if (!answers.newvideoprivate) { privacystring = "Public" }
    Vindexer.uploadVideo(answers.newvideourl, {
      name: answers.newvideoname,
      privacy: privacystring,
    }).then(function (response) {
      videoResult = JSON.parse(response.body);
      console.log(`\nSuccess! Your video is currently being analyzed. Its assigned breakdown ID is '${videoResult}'.\n`);
      if (privacystring == 'Public') { console.log(`Once the analysis is complete, anyone can view the public video and its insights at https://www.videoindexer.ai/media/${videoResult}.\n`); }
      else { console.log(`Once the analysis is complete, you can view the private video and its insights at https://www.videoindexer.ai/media/${videoResult}.\n`); }
      mainMenu();
    });
  });
}

function viewInsights() {
  Vindexer.search({ owner: owner })
    .then(function (response) {
      insightResult = JSON.parse(response.body).results;
      for (let i = 0; i < insightResult.length; i++) {
        myinsights.choices.push("| " + insightResult[i].id + " | " + (insightResult[i].name + "                                     ").substring(0, 25) + " |");
      }
      listInsights();
    });
}

function listInsights() {
  inquirer.prompt(myinsights).then(function (answers) {
    if (answers.myinsights === "|-----------------GO BACK----------------|") {
      mainMenu();
    }
    else {
      selectedid = (answers.myinsights).substring(2, 12);
      insightActions();
    }
  });
}

function insightActions() {
  inquirer.prompt(videoactions).then(function (answers) {
    if (answers.options === "Get keywords") {
      Vindexer.getBreakdown(selectedid).then(function (result) { 
        console.log("\nKeywords: ");
        let breakdownresults = JSON.parse(result.body);
        for (let i=0; i<breakdownresults.summarizedInsights.topics.length; i++) {
        console.log(" - " + breakdownresults.summarizedInsights.topics[i].name);
        }
      mainMenu(); });      
    }
    else if (answers.options === "Get sentiment scores") {
      Vindexer.getBreakdown(selectedid).then(function (result) { 
        console.log("\nAverage sentiment:");
        let breakdownresults = JSON.parse(result.body);
        for (let i=0; i<breakdownresults.summarizedInsights.sentiments.length; i++) {
        console.log(breakdownresults.summarizedInsights.sentiments[i].sentimentKey + ": " + Math.round(breakdownresults.summarizedInsights.sentiments[i].seenDurationRatio * 100) + "%");
        }
      mainMenu(); });      
    }
    else if (answers.options === "Get insights widget URL") {
      Vindexer.getInsightsWidgetUrl(selectedid).then(function (result) { console.log("\nInsights widget URL: " + JSON.parse(result.body) + "\n");
      mainMenu(); });
    }
    else if (answers.options === "Get player widget URL") {
      Vindexer.getPlayerWidgetUrl(selectedid).then(function (result) { console.log("\nPlayer widget URL: " + JSON.parse(result.body) + "\n");
      mainMenu();
     });
    }
    else if (answers.options === "Get subtitles URL") {
      Vindexer.getVttUrl(selectedid).then(function (result) { 
        console.log("\nYour subtitle file is available at " + JSON.parse(result.body) + "\n");
        mainMenu(); });
    }
    else if (answers.options === "Delete video") {
      Vindexer.deleteBreakdown(selectedid, {deleteInsights: false}).then(function () { 
        console.log("\nDeleted video.\n");
      mainMenu();
  });
    }
    else if (answers.options === "Delete video and insights"){
      Vindexer.deleteBreakdown(selectedid, {deleteInsights: true}).then(function () { 
        console.log("\nDeleted video and insights.\n");
        mainMenu(); 
    });
    }
    else {
      console.log(`error!`);
      mainMenu();
    }
  })
}