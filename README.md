# Remix of Orbloom Worm Arena

Here is the lean blueprint for a browser worm game ready for CrazyGames:



1. Core Loop (Build this first)

- Controls & arena: Mouse cursor steers the head; smooth trailing body segments follow behind. Bounded circular or rectangular grid arena.

- Eating & growth: Scattered glowing orbs add length and score. Spacebar or left-click triggers speed boost at the cost of shedding small food pellets behind.

- Collision rules: Hitting your head against any other worm's body or the arena boundary kills you instantly.

- Death drop: When a worm dies, its entire body converts into dense, high-value food orbs so nearby worms rush in for the feast.



2. The Illusion of Multiplayer (Bots)

- 15–25 simulated bots roaming the arena with believable behavior:

  - Default: wander toward nearby food clusters.

  - Aggressive (when big): try to cut off smaller worms by boosting across their path.

  - Evasive (when small): turn away when a larger worm's head gets too close.

- Give each bot a randomized gamer tag and color palette so the leaderboard on the top-right feels live.



3. CrazyGames Polish & Monetization Hooks

- Round-end screen: Shows final score, longest length, and placement out of the lobby.

- CrazyGames SDK hooks:

  - Mid-roll ad: Trigger between rounds (e.g., every 2–3 deaths, not every single death).

  - Rewarded ad: "Revive with 50% of your mass" or "2x coins this run."

- Skin shop: Coins earned from playing unlock 8–10 fun worm patterns (stripes, neon, flags), giving players a reason to keep grinding.



When you're ready to build it on your other account, start by asking for just Phase 1 (movement, food, and collisions on an HTML5 canvas) before touching bots or menus. That gets you a fun, playable prototype in the first prompt.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4559bffe-c782-4585-9b4d-1418dc13c1ce).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
