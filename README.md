did
========

A Node based CLI for iDoneThis

## Installation
1. Install [Node.js](http://nodejs.org)
2. Run `npm install -g did`. *You may have to preface this with `sudo` depending on your permissions.*
3. Add your iDoneThis key to your shell as an environment variable named "IDONETHIS_API_TOKEN". You can have it set every time you run a terminal by adding it to your `.zshrc` or `.bashrc`. You can get your api key here: https://idonethis.com/api/token/

## Help

Run `did --help` or `did COMMAND --help` for help using the tool

## Options

### API Tokens

If you're too lazy to add your token to your environment, you can specify it at runtime with `-t` or `--api-token`. for example, `did -t top-secret-api-token do MyTeamName "I fixed a thing!"`. Ideally though, you'll want to add the token to your environment once, to make your life easier.

### Goals

Add a done as a goal by using the `-g` or `--goal` flag. This basically will just append '[] ' to the task you enter.

### Interactive mode

Add dones interactively. You must specify a valid Team. enter 'done' to exit interactive mode.

`did -i Webmaker`

## Command Reference

### List your teams

`did teams`

### Create a new done for a Team you're on

`did do [team name] "The done that you did"`

Assuming your team name isn't 'teams', you can omit the `do`

`did [team name] "yay shorthand!"`

If you're not sure what the team name is, run `did teams` to list your teams

### Open iDoneThis in your default browser

`did open [optional team name]`

As stated above, if you don't know what your teams are, run `did teams`. Leaving out a team name will bring you to your iDoneThis homepage.
