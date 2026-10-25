# Pigeon Hustle

A 2D browser platformer. You're a city pigeon, and your job is to grab every carton of fries in town.
You only get **3 flaps** before you have to land again, so plan your route across benches, café awnings, bus stops and rooftops.

## How to play

| Key | Action |
| --- | --- |
| ← → (or A / D) | Walk |
| ↑ or Space (or W) | Flap (3 per landing) |
| Hold ↑ / Space while falling | Glide |
| R | Restart |

## What's in here

- `index.html` is the web page that holds the game.
- `game.js` is the game itself. The **tuning knobs** at the top (walk speed, flap power, number of flaps) and the **LEVEL** and **FRIES** lists are the easiest places to start changing things.
- `lib/phaser.min.js` is [Phaser](https://phaser.io), the free game framework that handles drawing, gravity and collisions (MIT license, see `lib/PHASER-LICENSE.md`).

## Playing it on your computer

Open `index.html` in a browser. If the game doesn't show up, run a small local web server from this folder (for example `python3 -m http.server`) and open http://localhost:8000.
