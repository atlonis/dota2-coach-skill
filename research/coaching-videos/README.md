# Coaching video notes

Distilled notes from 50 public Dota 2 coaching videos. This is repository research, not part of the installed skill: the review agent does not read it.

## What it is for

- **A reference for review quality.** In a coaching review of someone else's game, the coach picks a main problem for a player at a stated MMR. Those picks show what a real, fixable problem looks like, and they give the evaluation of our own reviews something to compare against.
- **What to check.** Each coach claim is tied to the signal in our match artifact that could detect it, or marked as not observable. Across all notes this becomes a checklist and a map of the data the runtime does not collect yet.
- **Exercises.** The drills and homework coaches give, with their source, as material for the review's training task.

## Rules for the notes

- Claims are the coach's opinions, paraphrased. They are not verified facts, and nothing here can support a conclusion about a match without that match's own evidence.
- Nothing tied to a patch is kept: item and hero recommendations, numbers, the meta. Current mechanics come only from the Valve datafeed. Each note records the patch current when the video was published.
- Notes are summaries, not transcripts, and contain no long quotations.
- Transcripts come from YouTube's auto-generated captions in the video's own language. The caption tracks of auto-dubbed audio are excluded. Captions carry no picture, so a coach's "here" on the replay loses its map context.

## Selection

- **Mix:** 26 coaching reviews of someone else's game, 10 macro guides, 7 micro and laning guides, 7 role guides. 26 are in Russian and 24 in English, about 34 hours in total.
- **Recency:** 2025–2026 is preferred. Older videos are kept only when their subject does not age: creep aggro, lane equilibrium, micro, and one 2022 coaching session.
- **Exclusions:** patch meta, tournament analysis, podcasts, entertainment clips, Shorts, members-only videos, and videos without captions.

## Note format

Each note lives in `notes/<n>-<video id>.md`.

1. **Header:** video link, channel, publication date, length and language; the patch at publication; the video type; the subject (role, hero, player MMR); caption caveats.
2. **Main finding** for a review, or **Core idea** for a guide.
3. **Findings.** Each one is a heading `F<k> · <video time> · <stage> · <topic>`, then the claim, then its signal tagged with one of four categories:
   - **observable:** the current artifact already contains it;
   - **derivable:** the sources contain it, but the runtime does not compute it yet;
   - **partly observable:** only part of the claim can be seen in the data;
   - **not observable:** match data cannot show it, for example vision, intent, mana or cooldown state.
4. **Coaching method**, for reviews only: how the coach ran the session.
5. **Exercises the coach gave.**
6. **Not taken:** what was left out, and why.

## Reproduce

Transcripts are kept locally in `transcripts/`, which git ignores. To rebuild them:

```sh
yt-dlp --skip-download --write-auto-subs --sub-langs "<lang>-orig" --sub-format vtt -o "research/coaching-videos/transcripts/%(id)s.%(ext)s" -- <video id>
node research/coaching-videos/tools/vtt-to-text.mjs research/coaching-videos/transcripts
node research/coaching-videos/tools/index.mjs
```

`<lang>` is the video's own language, `ru` or `en`, as listed in `videos.json`. `index.mjs` rewrites the index below from `videos.json` and the notes present.

## Index

<!-- index:start -->
| # | Video | Channel | Published | Patch | Lang | Kind | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | [BSJ Dota 2 Coaching 5500, Carry](https://youtu.be/cZcAjAqiQtE) | Dota Dojo | 2026-06 | 7.41c | EN | review | pending |
| 2 | [BSJ Dota 2 Coaching 2200, Carry](https://youtu.be/9rlRD3epTkg) | Dota Dojo | 2026-05 | 7.41c | EN | review | [note](notes/02-9rlRD3epTkg.md) |
| 3 | [BSJ Dota 2 Coaching 2200, Mid](https://youtu.be/_Y9Aacq-7RM) | Dota Dojo | 2026-04 | 7.41b | EN | review | pending |
| 4 | [BSJ Dota 2 Coaching 3880 Support](https://youtu.be/auFX6W2kCRg) | Dota Dojo | 2026-04 | 7.41b | EN | review | pending |
| 5 | [BSJ Dota 2 Coaching 2700, Offlane](https://youtu.be/ZvTiXVLS-yE) | Dota Dojo | 2026-06 | 7.41c | EN | review | pending |
| 6 | [BSJ Dota 2 Replay Analysis: 5100, Mid](https://youtu.be/KapbK98fq8M) | Dota Dojo | 2026-04 | 7.41b | EN | review | pending |
| 7 | [Ex Pro replay review of top 500 OFFLANE PLAYER - Dota 2 Coaching](https://youtu.be/8MhRNyixcOU) | Khezu Dota Coaching | 2026-04 | 7.41a | EN | review | pending |
| 8 | [I turned a 2k MMR player into SMURF](https://youtu.be/b-AzCh2YkH8) | BalloonDota | 2026-09 | 7.41e | EN | review | pending |
| 9 | [Reviewing My Own Replays: Laning Mistakes & Early Game Decisions / DuBu Dota2](https://youtu.be/Cxtd-Fs7MqI) | DuBu | 2026-09 | 7.41f | EN | review | pending |
| 10 | [I coached Jenkins on my favorite dota hero](https://youtu.be/ftxKQgYa_VI) | BSJ | 2025-12 | 7.39e | EN | review | pending |
| 11 | [@Dendi COACHES GRUBBY IN DOTA 2!](https://youtu.be/mbnvE74XG_o) | Grubby | 2022-08 | 7.32 | EN | review | pending |
| 12 | [КАК ВЫБРАТЬСЯ С 2К ПТС / РАЗБОР ОТ ДАХАКА](https://youtu.be/Fj6NGsFo22E) | Daxak Dota | 2026-06 | 7.41d | RU | review | pending |
| 13 | [РАЗБОР 5.000 КЕРРИ](https://youtu.be/ZPtgItnXVkA) | Daxak Dota | 2026-07 | 7.41d | RU | review | [note](notes/13-ZPtgItnXVkA.md) |
| 14 | [ЕСТЬ ЛИ РАЗНИЦА МЕЖДУ 1К И 7К ММР? (минимальная) / РАЗБОР ОТ ТОП-30 ТРЕНЕРА](https://youtu.be/MktSL2o9YTQ) | Common Sense Dota | 2026-06 | 7.41d | RU | review | pending |
| 15 | [Выиграл мид? Красавчик, а слабо реализовать преимущество?](https://youtu.be/xh0-VtLvDG0) | Common Sense Dota | 2026-08 | 7.41e | RU | review | pending |
| 16 | [ЭТО ТОЧНО ЕГО ММР?! 10к ТРЕНЕР РАЗБИРАЕТ игру подписчика на 4000 ММР / Treant Protector 7.41d](https://youtu.be/hZe6LlQtuqk) | SERGGEICH | 2026-06 | 7.41d | RU | review | pending |
| 17 | [НАНЯЛ 13К ТРЕНЕРА ЧТОБЫ ОН РАЗОБРАЛ САМУЮ ГЛУПУЮ ИГРУ](https://youtu.be/KHurOMCy43c) | Daxak Dota | 2026-03 | 7.40c | RU | review | pending |
| 18 | [И ЭТО ВАШ ТРЕНЕР? ДАХАК УЧИТ ИГРАТЬ 15К ТРЕНЕРА ПО ДОТЕ (ft. @ueioueio)](https://youtu.be/K9JRV6lQDis) | Daxak Dota | 2026-01 | 7.40b | RU | review | pending |
| 19 | [Как правильно саппортить? 14к тренер ДУШНО разбирает каждую свою ошибку](https://youtu.be/sqicoyFqlBs) | Common Sense Dota | 2026-03 | 7.40c | RU | review | pending |
| 20 | [РЕАКЦИЯ ТРЕНЕРА на ДАХАК РАЗОБРАЛ СКУФА 2К ММР](https://youtu.be/ZbcyZYrnHxI) | BlazzerFox Dota | 2026-02 | 7.40c | RU | review | pending |
| 21 | [ТРЕНЕР РАЗОБРАЛ ОШИБКИ НОВИЧКА DOTA 2](https://youtu.be/WAcK_bDcb3o) | Folzygenius | 2026-01 | 7.40c | RU | review | pending |
| 22 | [ДАХАК РАЗБИРАЕТ ИГРУ 8К ММР БУСТЕРА С 8300 ОТЗЫВАМИ / DAXAK DOTA 2](https://youtu.be/KBAegvY8Z48) | Лучшее с Дахаком | 2026-05 | 7.41b | RU | review | pending |
| 23 | [Я ЗАКАЗАЛ 15К ММР ТРЕНЕРА ПО ДОТЕ И НЕ БЫЛ ГОТОВ...](https://youtu.be/5xia5xLiurE) | Lemchanskiy | 2025-08 | 7.39d | RU | review | pending |
| 24 | [ТРЕНЕР ОФИГЕЛ ОТ СКИЛЛА СЕРЕГИ ПИРАТА НА АНТИМАГЕ / РАЗБОР ИГРЫ](https://youtu.be/JtBA92S72Io) | BlazzerFox Dota | 2024-09 | 7.37c | RU | review | pending |
| 25 | [ГОЛОВАЧ РАЗБОР ИГРЫ ОТ 11К ММР ТРЕНЕРА! ОН НИКОГДА НЕ ОШИБАЕТСЯ!? LenaGolovach DOTA 2](https://youtu.be/Ut1jpLrOdi4) | Shergarat (Vladimir) | 2024-07 | 7.36c | RU | review | pending |
| 26 | [Тренер Дота 2 / Разбор игры за Zeus Дота 2 / Обучение Дота 2](https://youtu.be/KW0e2hShp3w) | Дота 2 Тренер | 2024-04 | 7.35d | RU | review | pending |
| 27 | [Why You Keep Throwing Winning Games / Dota 2](https://youtu.be/jc3GfKioTGw) | Support Heaven | 2026-09 | 7.41f | EN | macro | pending |
| 28 | [Why You Struggle With Low Farm But Pros Don't](https://youtu.be/f6IGul_HEms) | PainDota | 2026-09 | 7.41f | EN | macro | pending |
| 29 | [Why 'Farm or Fight' Is the Wrong Question](https://youtu.be/CyliAPTgmGQ) | BSJ | 2026-08 | 7.41e | EN | macro | [note](notes/29-CyliAPTgmGQ.md) |
| 30 | [Your Idea of Farming is Outdated](https://youtu.be/iSRPQwrQFww) | BSJ | 2026-06 | 7.41d | EN | macro | pending |
| 31 | [КАК ПРАВИЛЬНО ФАРМИТЬ / ГАЙД ОТ 15К ТРЕНЕРА (.ft ⁨@ueioueio⁩ )](https://youtu.be/s6Ruehc5ocE) | NVGATO | 2026-07 | 7.41d | RU | macro | pending |
| 32 | [КАК НАУЧИТЬСЯ ДУМАТЬ В ДОТЕ?/гайд как обыграть всех на своём рейтинге](https://youtu.be/C2hn-YR3a9w) | Gostix | 2026-01 | 7.40b | RU | macro | pending |
| 33 | [ТЕМП И ТАЙМИНГ — САМЫЙ ВАЖНЫЙ ГАЙД в жизни любого ИГРОКА](https://youtu.be/SLbn2nL2Jh8) | Samorodok | 2025-12 | 7.39e | RU | macro | pending |
| 34 | [Все МАКРО ФИШКИ для МИДА от 13к тренера / МИД UEIO](https://youtu.be/D1zCgUuAllA) | Ueio | 2025-02 | 7.37e | RU | macro | pending |
| 35 | [ТЫ Играешь по МИКРО И МАКРО НЕ ПРАВИЛЬНО, и вот почему..](https://youtu.be/pHwJav9qIWk) | mugetsu | 2025-03 | 7.38b | RU | macro | pending |
| 36 | [ПОЧЕМУ БУСТЕРЫ АПАЮТ ММР, А ТЫ НЕТ? Дота 2 гайд.](https://youtu.be/zfmiV7Rsl-s) | str | 2024-10 | 7.37d | RU | macro | pending |
| 37 | [Why You SUCK at LANING (And How to Fix It) - Dota 2](https://youtu.be/Wlj-oNzVZ78) | BalloonDota | 2026-09 | 7.41f | EN | micro and laning | pending |
| 38 | [I Coached 100+ Supports. This Is Why They Lose Lanes.](https://youtu.be/8xYPk9qhPDA) | Support Heaven | 2026-09 | 7.41e | EN | micro and laning | pending |
| 39 | [Your Laning Phase Is Keeping You Stuck in Low MMR - Dota 2 Carry Guide](https://youtu.be/J6m5LDaP_B0) | BalloonDota | 2026-08 | 7.41e | EN | micro and laning | pending |
| 40 | [Understanding Creep Aggro / Dota 2 Guide](https://youtu.be/Bcg3VVuPsXs) | ZQuixotix | 2023-12 | 7.34e | EN | micro and laning | pending |
| 41 | [How to Micro - Fundamentals, Tips, & Tricks / Dota 2 Guide](https://youtu.be/RqP7MTqotJE) | ZQuixotix | 2023-04 | 7.32e | EN | micro and laning | pending |
| 42 | [МИКРОСКИЛЛ. Как улучшить Ластхит, Реакцию, Мапконтроль, Тайминги. Карты для повышения скилла ДОТА](https://youtu.be/lUgaYe2VAxQ) | Свит | 2023-01 | 7.32d | RU | micro and laning | pending |
| 43 | [How to Maintain Lane Equilibrium (Last Hitting AND Denying Creeps) - Dota 2 Fundamentals (Episode 3)](https://youtu.be/Fj4Mw-oF4jQ) | BSJ | 2021-03 | 7.28c | EN | micro and laning | pending |
| 44 | [How a High MMR Support Thinks / Dota 2](https://youtu.be/krokxuAKtXA) | Support Heaven | 2026-09 | 7.41f | EN | role | pending |
| 45 | [Тебя неправильно учили играть на керри](https://youtu.be/fVO29u48dB8) | Common Sense Dota | 2026-09 | 7.41e | RU | role | pending |
| 46 | [КАК ВЫБРАТЬСЯ С ЛОУ ММР НА МИДЕ](https://youtu.be/CcYJvrPlNRI) | Ueio | 2026-05 | 7.41c | RU | role | pending |
| 47 | [КАК ВЫБРАТЬСЯ С ЛОУ ММР НА КЕРРИ](https://youtu.be/DTXP_T5Z80s) | Ueio | 2026-05 | 7.41c | RU | role | pending |
| 48 | [How to Play Offlane after LOSING Lane - Offlane Guide Dota 2](https://youtu.be/kWOSCJv0BJM) | BalloonDota | 2026-01 | 7.40b | EN | role | pending |
| 49 | [Dota 2 Is WAY Easier Than You Think (No BS Guide)](https://youtu.be/PrPEWVHNkPw) | BalloonDota | 2026-03 | 7.40c | EN | role | pending |
| 50 | [ГАЙД НА САППОРТОВ от 10К ММР ТРЕНЕРА](https://youtu.be/cm0OiAd2d48) | Dimen | 2024-09 | 7.37c | RU | role | pending |
<!-- index:end -->
