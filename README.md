# Elevator song Discord bot

[Idea came from uhmmm.app](https://uhmmm.app/?ref=CamTosh/elevator-song-discord-bot)

`ffmpeg -i input.mp3 -c:a libopus -b:a 96k output.ogg` ([Convert mp3 to ogg](https://discordjs.guide/voice/optimisation-and-troubleshooting.html#using-ogg-webm-opus-streams))

## Installation

- [Create bot](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)
- `yarn install` / `npm install`
- `cp .env.default .env`
- Edit .env var
- `node src/app.js`
