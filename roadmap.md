# Wormz Roadmap

> Every future update must read this file first and update it (check off finished items, add new asks).

## 1. Core Loop
- [x] Mouse cursor steers the head; smooth trailing body segments
- [x] Bounded circular arena
- [x] Food orbs add length and score (real-looking apple, donut, candy icons)
- [x] Spacebar / left-click speed boost with mass cost, no tiny food trails
- [x] Head hitting another worm's body or the arena edge = instant death
- [x] Death drop: body turns into dense, high-value food
- [x] Mobile controls (joystick + boost button)
- [x] Arena background texture
- [x] Sound effects (eat combo, boost, death, start, nearby kill) + mute button

## 2. The Illusion of Multiplayer (Bots)
- [x] 15–25 simulated bots
- [x] Default: wander toward nearby food clusters
- [x] Aggressive (when big): boost to cut off smaller worms
- [x] Evasive (when small): turn away from larger worms' heads
- [x] Randomized gamer tags and color palettes per bot
- [x] Live leaderboard (top-right)
- [x] Bots dodge bodies instead of suiciding into them (whisker probe)

## 2b. Lobby, Skins, Music & Landscape Layout
- [x] Home screen like a real game: your animated worm, name badge, Skin shop + Ranking tiles, big BATTLE! button straight into the match
- [x] Pick name + skin in the lobby (saved between visits)
- [x] 10 patterned skins (stripes, bands, spots, Algeria flag…) for player and bots, glossy round segments
- [x] Background chiptune music + separate music toggle
- [x] Landscape-first HUD: audio + length top-left, compact leaderboard top-right, controls bottom corners
- [x] "Rotate your phone" screen in portrait; fullscreen + landscape lock on phones
- [x] All UI icons generated art (play, music, boost, trophy, skins, players, rotate)
- [x] Art restyle: bright blue cartoon look — new ground, glossy fruit/cupcake food, bubble icons, WORMZ logo, blue + yellow theme

## 3. CrazyGames Polish & Monetization Hooks
- [x] First-visit asset loading progress with retry; wait for decoded artwork before lobby or play
- [x] Phone lobby: fully visible Battle button, separated profile/audio/navigation, compact match HUD
- [x] Five temporary arena pickups: speed, magnet, shield (body collisions only), double food, and slow bots; custom shared icons, expiry and clutter limits; verified collection and retry reset
- [x] Remove tiny boost trails for player and bots; cap death loot at 160 with a 45-second lifetime alongside 260 normal food
- [x] Polish lobby with original garden artwork, larger worm preview, and dimensional wardrobe previews
- [x] Verify wardrobe selection and persistence, ranking, boost/battle flow, and mobile landscape layout; 23 tests passing
- [x] Round-end screen: final score, longest length, placement in lobby
- [ ] CrazyGames SDK: mid-roll ad every 2–3 deaths
- [ ] Rewarded ad: "Revive with 50% of your mass" or "2x coins this run"
- [x] Coins earned from playing
- [x] Skin shop: lock some of the 10 skins behind coins

## 4. Mohamed's Rework Pass (Nov 2026)
- [x] New arena ground artwork (recreated, tileable, cartoon garden)
- [x] Real glossy icons for all five powers (speed, magnet, shield, double, slow) in arena + HUD
- [x] Powers much rarer: 1–2 drop at a time with a drop-in animation, never a wall of pickups
- [x] Pro redesign of the round-end screen; home button visible on phones
- [x] Mode picker after Battle: 1 vs 1, 4 vs 4 (teams), 1 vs 30

## 5. Gold & Living Arena
- [x] Earn gold from matches and buy permanent skin unlocks (100 starter gold; 2 per 5 seconds, capped at 120)
- [x] Rare fog storms with clearly warned, nonlethal lightning and bot parity
- [x] Actual kill attribution, double/triple kill callouts and custom animated head reactions
- [x] Polish: bouncier pop-in reactions with burst rays, denser darker fog, softer filtered music
- [x] Verify purchases and match reward readback, storm fairness rules, artwork and phone shop; 40 tests pass. Natural storm encounter and multi-kill flow not observed in the browser match (player died early); effects checked separately.

## 6. Social & Quests (requested Nov 8 2026)
- [x] Fix match freezing after ~2 minutes (fading reaction bubble drew a negative circle and crashed the frame loop; loop now survives a bad frame)
- [ ] First visit: choose a username (saved to account)
- [ ] Friends: search players by username, send/accept friend requests
- [ ] Friends bar on the right side with avatars + "+" invite button; online status
- [ ] Party invites: leader picks mode; 4 vs 4 = friends on same team, 1 vs 1 = friends face each other
- [ ] 1 vs 30 becomes true free-for-all (everyone vs everyone)
- [ ] Generated profile pictures / avatar icons
- [ ] Quests: daily, weekly and one-time (play 30 min, earn gold, reach length…) with gold rewards
