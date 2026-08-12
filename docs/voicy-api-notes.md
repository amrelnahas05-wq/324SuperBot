# Voicy API integration notes

Source: https://api.voicy.network/
OpenAPI collection: https://api.voicy.network/VoicyAPI_Collection.json

The official documentation states that Voicy exposes a searchable library of funny audio memes and requires an API key in the `X-API-KEY` request header. The documented clips endpoint is `GET https://api.voicy.network/v1/clips`. The collection shows query parameters including `type`, `value`, `quantity`, `search`, and `sort`, and clip responses use fields such as `ID`, `Name`, `Sound`, `Thumbnail`, `Category`, and `Tags`.

The bot command uses `VOICY_API_KEY` from the environment, sends it via `X-API-KEY`, searches `/v1/clips`, downloads the returned `Sound` URL as an audio buffer, and sends it as `audio/mpeg`.
