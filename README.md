did
========

A Node based CLI for iDoneThis

## Installation
1. Install [Node.js](http://nodejs.org)
2. Run `npm install -g did`. *You may have to preface this with `sudo` depending on your permissions.*
3. Add your iDoneThis key to your shell as an environment variable named "IDONETHIS_API_TOKEN". You can have it set every time you run a terminal by adding it to your `.zshrc` or `.bashrc`

## Help

Run `did --help` or `did COMMAND --help` for help using the tool

## Command Reference

### List your teams

`did teams`

### Create a new done for a Team you're on

`did do [team name] "The done that you did"`

If you're not sure what the team name is, run `did teams` to list your teams
