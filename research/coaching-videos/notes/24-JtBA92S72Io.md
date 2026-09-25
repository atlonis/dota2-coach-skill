# 24 · A coach reviews a streamer's strong carry game

- **Video:** [ТРЕНЕР ОФИГЕЛ ОТ СКИЛЛА СЕРЕГИ ПИРАТА НА АНТИМАГЕ / РАЗБОР ИГРЫ](https://youtu.be/JtBA92S72Io) · BlazzerFox Dota · 2024-09-07 · 47 min · Russian
- **Patch at publication:** 7.37c. Hero, facet, neutral item and build choices are left out.
- **Type:** replay review of a streamer's game. The streamer narrates his own thinking on stream, so the coach compares that reasoning with the map.
- **Subject:** position 1 Anti-Mage in a high-MMR public game, in a hard lane against a duelling offlaner
- **Source:** auto-generated captions only, heavily garbled: the streamer's voice, the coach's voice and music overlap. Only points stated clearly are kept.

## Main finding

A positive review: the coach judges the player the strongest in the lobby.

- He read his own and his opponents' resources in lane and traded without fear.
- He lost nothing for a kill and turned kill gold into his farming item at once.
- He played around the one enemy spell that could kill him.

The coach's criticism is narrow:
- the player was sometimes afraid when the map showed the enemy could not reach him;
- he spent his escape out of fear, and a side of the map fell meanwhile.

## Findings

### F1 · 1:35–2:37 · lane · pick the right trade target

**Claim.** In a hard lane, hit the hero whose regen or mana decides the lane, for example while she is healing. Fighting the support with the most mana instead let the offlaner out-trade him.

**Signal — not observable.** Health, mana and regen use are not recorded. Hero damage in the lane phase comes from `phases`.

### F2 · 7:35–9:07 · lane · a good lane in the coach's terms

**Claim.**
- Feel your resources and the opponents', and don't fear trades.
- Last hit well.
- Secure the rune near a kill.
- Lose no farm for the kill, and turn the kill gold into your farming item at once.

The coach calls this model laning. The player is also self-critical about each small slip.

**Signal — partly observable.** Last hits and denies by minute from `series`, and kills in the lane phase from `phases`. Purchase times after a kill are derivable from `items.purchases` and the collected kill events.

### F3 · 14:31–15:33 · midgame · fear the enemies that can actually reach you

**Claim.** The player felt he was about to be ganked, but the enemy offlaner stood far away at the top tower and could not have reached him in time. With the bottom lane pushed by his team and all enemies visible there, he could farm the top side safely. Base fear on where the enemies are and how fast they can get to you.

**Signal — derivable.** Enemy positions and their distance to the player, from all ten position rows. Not computed yet.

### F4 · 16:37–17:51 · midgame · leave your offlaner's camps

**Claim.** When your offlaner plays the lane next to two camps, don't farm them: he will farm them himself. If the enemies always stand in one lane, farm the enemy jungle on the other side instead.

**Signal — derivable.** Neutral kills by map area from the collected `events.cs` and their positions. Not computed yet.

### F5 · 23:06–23:36, 41:35–42:06 · midgame · play around the one spell that can kill you

**Claim.** The carry had one real threat: the enemy offlaner's single-target lockdown. While it is on cooldown, play aggressively: jump in, and split-push one side until the enemies gather, then switch to the other side. They cannot cross the base in time.

**Signal — not observable.** Enemy cooldowns are not recorded. Towers taken in those windows come from `objectives`.

### F6 · 27:29–28:29 · midgame · read the waves before joining a fight

**Claim.** A pushed mid lane means no enemy is in mid; they are top or bottom. Meeting five enemies with four heroes in their chosen position loses. Read where the enemies must be from the waves before you walk in.

**Signal — not observable.** Wave positions are not recorded. Deaths from such fights appear in `deathAnalysis.contexts`.

### F7 · 39:17–39:49 · late game · don't fight for an outer tower you can't hold

**Claim.** The enemy team fought under its outer towers although it could not even hold its high ground. A team that can't defend the high ground won't defend the outer towers; fighting there only costs heroes.

**Signal — partly observable.** Towers lost and their times come from `objectives`. Deaths near your own towers come from `deathAnalysis.contexts`.

### F8 · 44:06–44:38 · late game · don't spend your escape out of fear

**Claim.** Using an escape with no threat present cost the player his map presence: the enemy took a side of the map in that time.

**Signal — partly observable.** The player's item uses before a death are in `ownItemUses`. Other uses are collected in `events.itemUses` but not published. Towers lost come from `objectives`.

## Coaching method

- He confirmed good play explicitly, not only mistakes, and explained to viewers why each move was right.
- He compared the player's spoken fear with the map at that moment. Where the map showed no threat, he called it excessive caution.
- He separated the player's mistakes from the team's.

## Exercises the coach gave

None.

## Not taken

- Hero, facet, neutral item and item choices, and the debate over the linked shield (7.37c).
- Hero-specific reaction timing to the enemy's ultimate.
- The advertisement and comments on the other players.
