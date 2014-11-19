did
========

A Node based CLI for iDoneThis

## Installation
1. Install [Node.js](http://nodejs.org)
2. Run `npm install -g did`. *You may have to preface this with `sudo` depending on your permissions.*
3. Set up your iDoneThis API Token. See below for help with that. You can get your api key here: https://idonethis.com/api/token/

## Help

Run `did --help` or `did COMMAND --help` for help using the tool

## Options

### API Tokens

Did will first look on process.env for the `IDONETHIS_API_TOKEN` variable. It will then attempt to load a "didconfig.json" file in your Operating Systems data directory.
A token loaded from this file will take precedence over one on process.env. If you're too lazy to add your token to your environment, you can specify it at runtime with `-t` or `--api-token`.
For example, `did -t top-secret-api-token do MyTeamName "I fixed a thing!"`. This method has the higest precedence when determining what token to use.

Set or change your token by running `did config --api-token <token>`. This saves it to a didconfig file in your Operating Systems data directory.

### Goals

Add a done as a goal by using the `-g` or `--goal` flag. This basically will just append '[] ' to the task you enter.

### Interactive mode

Add dones interactively. You must specify a valid Team. enter 'done' to exit interactive mode.

`did -i Webmaker`

With default team set:
`did do -i` <- sadly, commander is kinda sketchy so 'did -i' won't work.

### Default team

Set your default team by passing the --default-team option to the `config` command.

`did config --default-team Webmaker`

## Command Reference

### List your teams

`did teams`

### Create a new done for a Team you're on

`did do [team name] "The done that you did"`

With default team set:
`did do "The done that you did"`

Assuming your team name isn't 'teams', you can omit the `do`

`did [team name] "yay shorthand!"`

With default team set:
`did "such ease, wow"`

Add a goal!
`did -g "fixed this thing and that!"`

If you're not sure what the team name is, run `did teams` to list your teams

### Open iDoneThis in your default browser

`did open [optional team name]`

As stated above, if you don't know what your teams are, run `did teams`. Leaving out a team name will bring you to your iDoneThis homepage.

### Set a default team and api token

`did config --default-team Webmaker --api-token mySecretToken`

Print your config with:
`did config`
