# journey-backend
[![Build Status](https://travis-ci.org/heymanhn/journey-backend.svg?branch=master)](https://travis-ci.org/heymanhn/journey-backend)
[![Coverage Status](https://coveralls.io/repos/github/heymanhn/journey-backend/badge.svg?branch=master)](https://coveralls.io/github/heymanhn/journey-backend?branch=master)

Journey helps you chronicle everything you do, wherever you go. Use the app to record your commute routes. Quickly jot down notes for ideas. Record an audio reminder for yourself. It's there when you need to look back at a day in the past. It’s as if you have instant access to your mind at all times.

The core datum for Journey is an Entry, and it can take multiple types: photo, video, audio, or text. The first version of this product includes an iOS app that allows you to submit entries and retrieve your entries in reverse chronological order. The app communicates with the backend (this repository) to store your journeys in the cloud.


## Set-up
Recommend using Homebrew if available to install these software packages:
* Install MongoDB
* Install NodeJS

Run the following commands to install the modules and launch the server:
* Run `npm install`
* Run `npm start` to launch server
* Run `npm run devsstart` to launch in the development environment
* Run `npm run test-local` to kick-off local Mocha test suites.


## Model

### Journey Entry Schema
Each journey entry includes the following:
* timestamp
* location (lat/lng coordinates)
* entry type
* entry contents (multi-part)

### Journey Entries
Add an entry to your journey, or view your past entries.

#### POST /entries
Add an entry to your journey. Supported entry types include:
* Text
* Photos
* Video
* Audio

Body params:
* `message` - Description (required for )
* `data` - Text contents


#### GET /entries
Returns a list of entries from your journeys.

Example JSON:
```
[
  {
    'entryId': 12345,
    'timestamp': 'June 22, 2016 03:35:16'
    'type': 'image',
    'imageURL': 'http://IMAGE_URL'
  },
  {
    'entryId': 12346,
    'timestamp': 'June 20, 2016 08:02:52'
    'type': 'text',
    'contents': 'Don''t give up on myself during my me-time. Let every day have purpose.'
  }
]
```
