# 11 · Dendi coaches Grubby, a newcomer, as a support

- **Video:** [@Dendi COACHES GRUBBY IN DOTA 2!](https://youtu.be/mbnvE74XG_o) · Grubby · 2022-08-30 · 58 min · English
- **Patch at publication:** 7.32. Several mechanics mentioned have changed since, so only general principles are kept.
- **Type:** live coaching of an unranked game from the coach slot. The first 13 minutes are a conversation about Warcraft 3 and a body-blocking demo.
- **Subject:** a Warcraft 3 professional with about 17 hours of Dota, playing position 5. No MMR yet.
- **Source:** auto-generated captions only

## Core idea

For a true beginner the coach teaches habits, not analysis:

- Keep resources on you and your lane partner.
- Treat the teleport as your most valuable tool.
- As a support, always carry vision and a smoke.
- Move with the team, and believe a game can still be won.

The session is a useful reference for what a coach considers basics. It carries little signal for an experienced player.

## Findings

### F1 · 16:36–19:13 · lane · creep aggro and farm priority

**Claim.** Attacking an enemy hero from outside the aggro range of the creeps doesn't pull them, so you can harass without moving the wave. As a support, generally give the last hits to your core. Gold used well by either player is fine, but your allies are a resource, and a support who takes creeps can upset them.

**Signal — partly observable.** Last hits are observable. Aggro and harass are not.

### F2 · 20:18–21:53, 26:03–28:37 · lane · always carry resources

**Claim.** Always have some resources on you, such as a stick and mana consumables, and give regen to your lane partner when he runs out. A lane without resources is a lane you can't play.

**Signal — observable.** Regen purchases from `items.purchases`. Items given to a partner are not recorded.

### F3 · 30:22–31:26 · any stage · the teleport is your most valuable tool

**Claim.** The teleport has an 80-second cooldown and at pro level is the main tool for any action on the map. When there is nothing urgent, walk instead of teleporting, so the teleport is ready when a teammate is attacked. Teleporting back to your tower after every death, as viewers suggested, is an oversimplification.

**Signal — derivable.** Teleports in `events.repositions` and whether one was used shortly before an allied death. Not computed yet.

### F4 · 32:27–36:40, 82:00–83:31 · any stage · vision and smoke as a support's kit

**Claim.**
- A support should always carry at least one sentry, one observer and a smoke.
- Place an observer next to a sentry to spot invisible rotations.
- Drop an observer at the start of a night-time fight, because vision decides the fight's decisions.
- Use smoke to gank as a team, and communicate it.

**Signal — partly observable.** Ward placements and times come from `wards`. Smoke use is not in the artifact.

### F5 · 37:42–41:18 · midgame · a support's options when the team is idle

**Claim.** In the quiet phase a support can reveal enemy smokes, protect the cores, or set up ganks. Join any fight where a teammate is attacked, at any level. A core who stays deep in a lane after seeing all five enemies group in his jungle dies alone.

**Signal — derivable.** Allied deaths while the player is far away, from positions and events.

### F6 · 44:01–45:04 · midgame · lanes pay more than camps early on

**Claim.** One lane wave gives about the gold and experience of an ancient camp. Farming the lanes beats jungling for a support early.

**Signal — derivable.** Lane versus neutral last hits, from the `isNeutral` flag in `events.cs`, which is collected but not published.

### F7 · 46:37–53:20 · any stage · move as a team

**Claim.** Two players aggressively searching the jungle while the enemy is unseen will die. The hardest part of the game is making the team move together, and the chances rise if you can.

**Signal — derivable.** Grouping from all ten position rows.

## Coaching method

- Relaxed, conversational, with questions answered as they come up.
- He praises what the student does well before adding a new idea.
- He deliberately teaches the conventional behaviour ("I don't want to teach you bad things").

## Exercises the coach gave

- Keep one sentry, one observer and one smoke on you at all times as a support.
- When nothing is urgent, walk and keep your teleport.

## Not taken

- Patch-specific mechanics from 7.32, such as the flagbearer creep, deny experience and Shadow Amulet timings.
- Item disassembly tips.
- The Warcraft 3 discussion.
