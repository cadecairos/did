#!/usr/bin/env node

var did = require('commander');
var request = require('request');
var clc = require('cli-color');
var BPromise = require('bluebird');
var openurl = require('openurl');
var path = require('path-extra');
var fs = require('fs');

var BASE_URL = 'https://idonethis.com/';
var API_VERSION = 'v0.1'
var API_URL = BASE_URL + 'api/' + API_VERSION + '/';

var apiToken = process.env.IDONETHIS_API_TOKEN;

var title = clc.red.underline;
var promptText = highlight = clc.red;
var row = clc.white;
var success = clc.green;
var warn = clc.yellow;
var error = clc.red.bold;

// load config file, if exists
var configFilePath = path.join(path.datadir('did'), 'didconfig.json');
var config = {};

try {
  config = fs.readFileSync(configFilePath, {
    encoding: 'utf8'
  });
  config = JSON.parse(config);
} catch (e) {
  if ( !fs.existsSync(path.datadir('did')) ) {
    fs.mkdirSync(path.datadir('did'));
  }
  config = {};
}

function limitCheck(val) {
  val = parseInt(val);
  if ( !isFinite(val) ) {
    return 10;
  }

  return Math.floor(val);
}

function saveConfig() {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(config), {
      encoding: 'utf8'
    });
    console.log(success('Config saved!'));
  } catch(e){
    console.log(error('Error saving your config!'), err);
    process.exit(1);
  }
}

function openURL(url) {
  openurl.open(url);
}

function setup() {

  if ( did.apiToken ) {
    apiToken = did.apiToken;
  } else if ( config.apiToken ) {
    apiToken = config.apiToken;
  }

  if ( !apiToken ) {
    console.error('Missing API Token - can be set on your env as "IDONETHIS_API_TOKEN" or passed in with -t or --apiToken');
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
        console.log(body);
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
        console.log(body);
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
          console.log(success('created for ' + newDone.owner + ' in the team "' + team + '"'));
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

  var hasDefaults = !task && config.defaultTeam;

  if (hasDefaults || (did.interactive && hasDefaults)) {
    task = team;
    team = config.defaultTeam;
  }

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
              console.log(success('created for ' + done.owner + ' in the team "' + team + '"'));
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

function updateConfig() {
  if (!did.defaultTeam && !did.apiToken) {
    console.log( JSON.stringify( config, null, 2 ) );
    console.log(success('Set new config values with --default-team and --api-token'));
    process.exit();
  }

  if ( did.defaultTeam ) {
    config.defaultTeam = did.defaultTeam;
  }

  if ( did.apiToken ) {
    config.apiToken = did.apiToken;
  }

  saveConfig();
}

function collectTags(val, tags) {
  if (val.indexOf(',') >= 0) {
    val.split(',').forEach(function(tag) {
      tags.push(val);
    });
  } else {
    tags.push(val);
  }
  return tags;
}

function buildFilter(key, value) {
  return key + '=' + value + '&';
}

function buildFilterString() {
  return new BPromise(function(resolve) {
    var requestFilters = '?';

    if (did.team) {
      requestFilters += buildFilter('team', did.team);
    }

    if (did.owner) {
      requestFilters += buildFilter('owner', did.owner);
    }

    if (did.doneDate) {
      requestFilters += buildFilter('done_date', did.doneDate);
    }

    if (did.doneAfter) {
      requestFilters += buildFilter('done_date_after', did.doneAfter);
    }

    if (did.doneBefore) {
      requestFilters += buildFilter('done_date_before', did.doneBefore);
    }

    if (did.tag && did.tag.length) {
      requestFilters +=  buildFilter('tags', did.tag.join(','));
    }

    if (did.sortBy) {
      requestFilters += buildFilter('order_by', did.sortBy);
    }

    if (did.limit) {
      requestFilters += buildFilter('page_size', did.limit);
    }

    if (did.page) {
      requestFilters += buildFilter('page', did.page);
    }

    resolve(requestFilters.slice(0, requestFilters.length - 1));

  });
}

function fetchDones(filterString) {
  return new BPromise(function(resolve) {
    var req = setup();
    req({
      method: 'GET',
      url: API_URL + 'dones/' + filterString
    }, function(err, resp, body) {
      if (err) {
        console.log(error('ERR: ' + err.code));
        process.exit(1);
      }

      if (resp.statusCode !== 200) {
        if (resp.statusCode === 400) {
          console.log(error('Invalid request data!'));
          console.log(body.errors);
        } else if (resp.statusCode === 404) {
          console.log(warn('Page not found'));
        } else {
          console.log(error('Request failed! check your token!'));
        }
        process.exit(1);
      }

      if ( !body.ok ) {
        console.log(error('Something went wrong!'));
        console.log(body);
        process.exit(1);
      }

      resolve(body);
    });
  });
}

function outputDones(body) {
  if ( !body.results || !body.results.length ) {
    console.log(warn('No dones found!'));
    return;
  }

  var page = did.page || 1;
  var limit = did.limit || 10;

  console.log(success('Found ' + body.count + ' dones'));
  console.log(success('Showing page ' + page + ' of ' + Math.ceil(body.count / limit) + '\n'));

  body.results.forEach(function(done) {
    console.log('On ' + done.done_date + ', ' + highlight(done.owner) + ' did:');
    console.log(unescape(done.raw_text) + '\n');
  });
}

function listDones() {
  if ( did.team ) {
    getTeams()
      .then(function(teams) {
        for (var i = 0; i < teams.length; i++) {
          if ( teams[i].name === did.team ) {
            did.team = teams[i].short_name;
            return buildFilterString();
          }
        }
        console.log(error('You are not a part of the team: ' + team));
        process.exit(1);
      })
      .then(fetchDones)
      .then(outputDones);
  } else {
    buildFilterString()
      .then(fetchDones)
      .then(outputDones);
  }
}

did
  .version('v0.5.0')
  .option('-t, --api-token <token>', 'Specify or save an API Token')
  .option('-g, --goal', 'Make this task a goal')
  .option('-i, --interactive', 'interactive done entry mode')
  .option('-m, --team <team>', 'Specify a team')
  .option('-o, --owner <owner>', 'Specify an owner')
  .option('-d, --done-date <date>', 'Specify a date that a done must be equal to. Format is \'YYYY-MM-DD\'. The special values \'today\' and \'yesterday\' are also valid.')
  .option('-a, --done-after <date>', 'Specify a date that dones must have been created on or after. Format is \'YYYY-MM-DD\'.')
  .option('-b, --done-before <date>', 'Specify a date that dones must have been created on or before. Format is \'YYYY-MM-DD\'.')
  .option('-s, --sort-by <sortby>', 'Specify the order dones are returned in. can be: \'created\', \'done_date\', \'-created\', or \'-done_date\'. The negative sign indicates a decreasing order. default is done_date')
  .option('-l, --limit <limit>', 'Specify a number of dones to fetch. default is 10, max is 100.', limitCheck)
  .option('-p, --page <page>', 'Specify a page number to fetch if there are more dones than could be fetched.')
  .option('--tag <tag>', 'Specify a tag. can be repeated to add multiple tags.', collectTags, [])
  .option('--default-team <team>', 'Set a default team in your config');

did
  .command('do [team] [task]')
  .description('Create a done for the specified team')
  .action(createDone);

did
  .command('teams')
  .description('List your teams')
  .action(teams);

did
  .command('open [team]')
  .description('Open iDoneThis in your default browser, optionally providing the team to view')
  .action(open)

did
  .command('config')
  .description('Configure did using the --default-team and --api-token options')
  .action(updateConfig);

did
  .command('dones')
  .description('show dones, which can be filtered using options')
  .action(listDones);

did
  .command('* [team] [task]')
  .description('Shorthand for \'do\'. If you set a default team, you can just type in your done (quoted)')
  .action(createDone);

did.parse(process.argv);
