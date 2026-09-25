# 20 · A coach reacts to Daxak coaching a 2,400 MMR carry

- **Video:** [РЕАКЦИЯ ТРЕНЕРА на ДАХАК РАЗОБРАЛ СКУФА 2К ММР](https://youtu.be/ZbcyZYrnHxI) · BlazzerFox Dota · 2026-02-16 · 60 min · Russian
- **Patch at publication:** 7.40c.
- **Type:** a reaction video with two coaches' views. BlazzerFox comments on Daxak's session with a player, a replay review followed by live coaching.
- **Subject:** position 1 Luna at about 2,400 MMR, a 28-year-old hobby player who blames his teammates ("they all ruin my games") and wants to reach 5–6K
- **Source:** auto-generated captions only; the two coaches' voices are mixed

## Main finding

Both coaches agree the player's problem is himself, not his teammates:

- his lane micro is weak, and he fights when he should push and pull;
- he farms the mid player's camps and gives the carry no impact on the map;
- he forgets basic actions under stress.

The reacting coach's frame: to improve, look only at yourself, however badly the team plays. He also warns that one live session changes nothing for a player weak in every area. That takes months of regular work.

## Findings

### F1 · 6:45–9:22 · lane · start the first wave well

**Claim.** In a lane of two ranged heroes against two melee, buy for that lane: a tree-cutter to clear sightlines against a hooking hero. On the first wave, either block properly or push to reach level 2 first. Take the ranged creep with your nuke. An unblocked, unpushed first wave leaves the lane where it is dangerous.

**Signal — partly observable.** Starting purchases come from `items.purchases`, and last hits at 1–2 minutes from `series`. Blocks are not observable.

### F2 · 9:54–13:30 · lane · push first, then pull

**Claim.** A simple pattern: first push the wave, then pull. Know when you are stronger. With a double wave while the enemy has no resources, you are; pulling the small camp then only loses the lane. If the enemy keeps the wave under their tower, a carry who farms camps quickly can leave to the jungle early.

**Signal — partly observable.** Last hits and denies by minute come from `series`. Wave position and pulls are not observable.

### F3 · 14:34–16:07 · early game · fight for the wisdom rune only with a reason

**Claim.** Going for the wisdom rune as a carry needs a solid advantage:
- more heroes;
- the enemy mid unable to rotate;
- a deeply pushed lane;
- enemies without resources.

As a routine every game it is nonsense: everyone dies there.

**Signal — not observable.** Wisdom rune pickups are not in the artifact. Kills and deaths near the rune time are observable.

### F4 · 18:41–20:14 · early game · don't farm the mid's camps

**Claim.** A carry who farms the camps the mid relies on hurts the team: the mid can't finish his farm. Those camps are also easy to gank from the high ground. Farm where your role's farm is.

**Signal — derivable.** The player's neutral kills in `events.cs` located in the mid's jungle, from positions. Not computed yet.

### F5 · 20:44–22:20 · midgame · a carry who doesn't join fights must push lanes

**Claim.** The lane always has priority. Farm the camps next to a lane, and push the lanes while teammates fight or the enemy shows elsewhere. A carry who only farms the jungle gives almost nothing: no pressure and no information. The strong carry pushes deep and far without dying.

**Signal — derivable.** Lane last hits against neutral last hits by phase, from `events.cs`, and the player's position during `events.teamfights`.

### F6 · 35:23–36:20 · midgame · a core can carry one observer

**Claim.** A core farming alone near the river or a twin gate can carry one observer. Drop it on the enemy's rotation path, farm, and push two side lanes without fear.

**Signal — observable.** `wards` records the player's placements; a carry's count is often zero.

### F7 · 41:35–42:37 · any stage · what you forget under stress is what you haven't learned

**Claim.** The player forgot his teleport and his immunity in tense moments. What you do only when calm isn't learned yet. It needs repetition until it survives pressure.

**Signal — partly observable.** Deaths with no item use in the window, from `ownItemUses` in `deathAnalysis.contexts`.

### F8 · 47:50–48:53, 55:36–56:39 · midgame · with the Aegis, wait for your item and group up

**Claim.** In low-MMR games, teammates with the Aegis charge in at once. Ask them to wait for your key item. The team kept spreading out and losing players one at a time. Simply staying together would have won.

**Signal — derivable.** Aegis timing from `objectives` and allied spread from all ten position rows.

### F9 · 31:44–32:14, 58:43–59:14 · mentality · look only at yourself

**Claim.** Venting at teammates relieves emotions but blocks improvement. If you want to improve, pay no attention to your teammates, however badly they play. Messaging a teammate that he ruined your lane made him leave.

**Signal — not observable.** No chat data.

## Coaching method

- Daxak: replay review with guiding questions, then live coaching in a new game with short instructions.
- BlazzerFox's critique: live coaching is hard for both sides at first. It works for one missing skill, not for someone weak everywhere. The coach should have given concrete, explained instructions rather than "more information".

## Exercises the coaches gave

- In lane: first push, then pull.
- As a carry, carry one observer and drop it on the enemy's rotation path while farming a side lane.

## Not taken

Item choices for this hero and the chat banter.
