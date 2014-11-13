#!/usr/bin/env node

var did = require('commander');
var request = require('request');
var clc = require('cli-color');
var BPromise = require('bluebird');

var API_VERSION = 'v0.1'
var BASE_URL = 'https://idonethis.com/api/' + API_VERSION + '/';

var apiToken = process.env.IDONETHIS_API_TOKEN;

function setup() {
  if ( did.apiToken ) {
    apiToken = did.apiToken;
  }

  if ( !apiToken ) {
    console.error('Missing API Token - can be set on your env as "IDONETHIS_API_Token" or passed in with -t or --apiToken');
    process.exit(1);
  }

  return request.defaults({
    headers: {
      Authorization: 'TOKEN ' + apiToken
    },
    json: true
  });
}

function getTeams() {
  return new BPromise(function(resolve) {
    var req = setup();
    req({
      method: 'GET',
      url: BASE_URL + 'teams/'
    }, function(err, resp, body) {
      if ( err ) {
        console.error('ERR: ' + err.code);
        process.exit(1);
      }

      if ( resp.statusCode !== 200 ) {
        console.error('Request Authorization failed! check your token!');
        process.exit(1);
      }

      if ( !body.ok ) {
        console.error('Something went wrong!');
        console.log(cliff.inspect(body));
        process.exit(1);
      }

      if ( !body.results.length ) {
        console.log(warn('You are not on any teams'));
        process.exit(0);
      }
      resolve(body.results);
    });
  });
}

function createDone(team, task) {
  return new BPromise(function(resolve) {
    var req = setup();
    req({
      method: 'POST',
      url: BASE_URL + 'dones/',
      body: {
        raw_text: task,
        team: team
      }
    }, function(err, resp, body) {
      if ( err ) {
        console.error('ERR: ' + err.code);
        process.exit(1);
      }

      if ( resp.statusCode !== 201 ) {
        console.error('Request Authorization failed! check your token!');
        process.exit(1);
      }

      if ( !body.ok ) {
        console.error('Something went wrong!');
        console.log(cliff.inspect(body));
        process.exit(1);
      }

      resolve(body.result);
    });
  })
}

var title = clc.red.underline;
var row = clc.white;
var success = clc.green;
var warn = clc.yellow;
var error = clc.red.bold;

did
  .version('0.0.1')
  .option('-t, --api-token [token]', 'Specify an API Token');

did
  .command('teams')
  .description('List your teams')
  .action(function() {
    getTeams()
      .then(function(teams) {
        console.log(title('Teams:'));
        teams.forEach(function(team){
          console.log(row(team.name));
        });
        process.exit(0);
      });
  });

did
  .command('do <team> <task>')
  .description('Create a done for the specified team')
  .action(function(team, task, otherTasks) {

    if ( !team ) {
      console.log(error('You must specify a team!'));
      process.exit(1);
    }

    if ( !task ) {
      console.log(error('You must provide your completed task!'));
    }

    getTeams()
      .then(function( teams ) {
        for (var i = 0; i < teams.length; i++) {
          if ( teams[i].name === team ) {
            return createDone(teams[i].short_name, task);
          }
        }
        console.log(error('You are not a part of the team: ' + team));
      })
      .then(function(done){
        console.log(success.underline('Your done was created!'));
        console.log(success('created for "' + done.owner + '"" in the team "' + team + '"'));
        console.log(success('Text: ' + done.raw_text));
      });
  });

did.parse(process.argv);
