# journey-backend

Journey helps you chronicle everything you do, wherever you go. Use the app to record your commute routes. Quickly jot down notes for ideas. Record an audio reminder for yourself. It's there when you need to look back at a day in the past. It’s as if you have instant access to your mind at all times.

The core datum for Journey is an Entry, and it can take multiple types: photo, video, audio, or text. The first version of this product includes an iOS app that allows you to submit entries and retrieve your entries in reverse chronological order. The app communicates with the backend (this repository) to store your journeys in the cloud.

## Set-up
TBD

## Model

### Journey Entry Schema
Each journey entry includes the following:
* timestamp
* location (lat/lng coordinates)
* entry type
* entry contents (multi-part)

## HTTP API

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

