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


## Model

### Journey Entry Schema
Each journey entry includes the following:
* timestamp
* location (lat/lng coordinates)
* entry type
* entry contents (multi-part)


## HTTP API

### Authentication and User Management
Journey uses JSON Web Tokens as the technology powering the API server's authentication. This means the server does not maintain sessions for each connection. Once the server authenticates a client and provides a JSON Web Token, all subsequent API requests need to include that token in the HTTP `Authorization` header.

#### POST /auth/login
Log in with either a username or email, as well as the password. The server returns the JSON web token if authentication is successful.

#### POST /users/
Create an account with a `username`, `email`, `password`, and optional `name`. The server generates a token and sends it back in the response.

#### GET /users/:id
Get information about a user. Only returns information for the user represented by the JSON Web Token.


### Journey Entries
Add an entry to your journey, or view your past entries. You can add entries of the following types:

* Text
* Photos
* Videos
* Audio

#### POST /entries/text
Add a text entry to your journey.

Body params:
* `data` - Text contents

#### POST /entries/images
Add a image entry to your journey.

Body params:
* `image` - Binary contents of the image

#### POST /entries/videos
Add a video entry to your journey.

Body params:
* `video` - Binary contents of the video media

#### POST /entries/audios
Add an audio entry to your journey.

Body params:
* `audio` - Binary contents of the audio media

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

