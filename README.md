# journey-backend
[![Build Status](https://travis-ci.org/heymanhn/journey-backend.svg?branch=master)](https://travis-ci.org/heymanhn/journey-backend)
[![Coverage Status](https://coveralls.io/repos/github/heymanhn/journey-backend/badge.svg?branch=master)](https://coveralls.io/github/heymanhn/journey-backend?branch=master)

Journey helps you organize your trips, allowing you to maximize your experiences at every destination you visit and to relive those moments when you return home.

This repository contains the API server for accessing Journey data. Please visit the [API documentation](http://docs.journeyapp.apiary.io/#) for more details.


## Set-up
Recommend using Homebrew if available to install these software packages:
* Install MongoDB
* Install NodeJS

Run the following commands to install the modules and launch the server:
* Run `npm install`
* Run `npm start` to launch server
* Run `npm run devsstart` to launch in the development environment
* Run `npm run test-local` to kick-off local Mocha test suites.


## NOTE
We set up a symlink that maps all modules to the 'app/' relative path for cleaner module loading syntax. However, this symlinking only works on Linux/OSX. Please follow the instructions on this article to set up the symlinking on Windows:
http://griever989.github.io/programming/2015/07/26/require-hell/
