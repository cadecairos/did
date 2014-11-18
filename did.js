#!/usr/bin/env node

var did = require('commander');
var request = require('request');
var clc = require('cli-color');
var BPromise = require('bluebird');
var openurl = require('openurl');

var BASE_URL = 'https://idonethis.com/';
var API_VERSION = 'v0.1'
var API_URL = BASE_URL + 'api/' + API_VERSION + '/';

var apiToken = process.env.IDONETHIS_API_TOKEN;

var title = clc.red.underline;
var promptText = clc.red;
var row = clc.white;
var success = clc.green;
var warn = clc.yellow;
var error = clc.red.bold;

function openURL(url) {
  openurl.open(url);
}

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
      url: API_URL + 'teams/'
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

function teams() {
  getTeams()
    .then(function(teams) {
      console.log(title('Teams:'));
      teams.forEach(function(team){
        console.log(row(team.name));
      });
      process.exit(0);
    });
}

function sendDone(team, task) {
  return new BPromise(function(resolve) {
    var req = setup();
    if ( did.goal ) {
      task = '[] ' + task;
    }
    req({
      method: 'POST',
      url: API_URL + 'dones/',
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

function prompt(msg){
  return new BPromise(function(resolve) {
    process.stdout.write(msg);
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', function(val){
      resolve(val.trim());
    }).resume();
  });
}

function interactiveDone(check, worker) {

  var resolver = BPromise.defer();

  var loop = function() {
    if ( !check() ) {
      return resolver.resolve();
    }
    return BPromise.cast(worker())
      .then(loop)
      .catch(resolver.reject);
  };

  process.nextTick(loop);

  return resolver.promise;
}

function interactiveMode(team) {

  var done;

  interactiveDone(function() {
    return done !== 'done';
  }, function() {
    return prompt(promptText('Enter done for ' + team + ' (done to end): '))
      .then(function(input) {
        done = input;
      })
      .then(function() {
        if (done !== 'done' && done !== '') {
          return sendDone(team, done);
        }
        if ( done === '' ) {
          console.log(warn('You didn\'t enter anything!\n'));
        }
        return BPromise.resolve;
      })
      .then(function(newDone) {
        if (newDone.owner) {
          console.log(success.underline('Your done was created!'));
          console.log(success('created for "' + newDone.owner + '"" in the team "' + team + '"'));
          console.log(success('Text: ' + newDone.raw_text + '\n'));
        }
        return BPromise.resolve;
      });
  })
  .then(function() {
    process.exit();
  });
}

function createDone(team, task) {
  if ((!task && !team) || (!task && !did.interactive)) {
    console.log(error('You must provide a team and a task'));
    process.exit(1);
  }

  getTeams()
    .then(function(teams) {
      for (var i = 0; i < teams.length; i++) {
        if ( teams[i].name === team ) {
          if ( did.interactive ) {
            return interactiveMode(teams[i].short_name);
          }
          return sendDone(teams[i].short_name, task)
            .then(function(done){
              console.log(success.underline('Your ' + (did.goal ? 'goal' :  'done') + ' was created!'));
              console.log(success('created for "' + done.owner + '"" in the team "' + team + '"'));
              console.log(success('Text: ' + done.raw_text));
            });
        }
      }
      console.log(error('You are not a part of the team: ' + team));
      process.exit(1);
    });
}

function open(team) {
  if ( !team ) {
    openURL(BASE_URL + 'home/');
    process.exit();
  }

  getTeams()
    .then(function(teams) {
      for (var i = 0; i < teams.length; i++) {
        if ( teams[i].name === team ) {
          openURL(BASE_URL + 'cal/' + teams[i].short_name);
          process.exit();
        }
      }
      console.log(error('You are not a part of the team: ' + team));
      process.exit(1);
    });
}

did
  .version('0.3.0')
  .option('-t, --api-token [token]', 'Specify an API Token')
  .option('-g, --goal', 'Make this task a goal')
  .option('-i, --interactive', 'interactive done entry mode');

did
  .command('teams')
  .description('List your teams')
  .action(teams);


did
  .command('do <team> [task]')
  .description('Create a done for the specified team')
  .action(createDone);

did
  .command('open [team]')
  .description('Open iDoneThis in your default browser, optionally providing the team to view')
  .action(open)

did
  .command('* <team> [task]')
  .description('Shorthand for \'do\'')
  .action(createDone);

did.parse(process.argv);
