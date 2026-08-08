/*
 * ADRIANA, A Podcast Companion for "Birth of a Parent"
 * ------------------------------------------------------
 * After listening to an episode, the listener becomes the guest.
 * Adriana hosts a voice interview grounded strictly in the episode's content.
 *
 * Prototype: Episode 5, Ritual (guest: Dimitris Xygalatas)
 *
 * ── SETUP (one time) ─────────────────────────────────────────────
 * 1. In the ElevenLabs dashboard, create an Agent (Agents → New agent).
 *    - Voice: pick a warm host voice you like (this becomes Adriana's voice).
 *    - LLM: choose a strong model (e.g. Claude Sonnet) for interview quality.
 *    - Leave the dashboard prompt minimal ("You are Adriana." is enough),
 *      the real prompt is sent from this file via overrides.
 * 2. Agent → Security tab:
 *    - Enable overrides for "System prompt" and "First message".
 *    - Keep the agent PUBLIC (no auth) for the prototype. No API key is
 *      ever placed in this file.
 *    - (Optional) In Agent → Tools, enable the "End call" system tool so
 *      Adriana can close the episode herself after the outro.
 * 3. Paste your agent id into AGENT_ID below.
 * 4. Repo: npm install @elevenlabs/react, then deploy to Netlify as usual
 *    (Vite/CRA build, same workflow as Electra).
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";

const AGENT_ID = "PASTE_YOUR_AGENT_ID_HERE";

/* ════════════════════════════════════════════════════════════════
   ADRIANA, persona and interview rules (shared by every episode)
   ════════════════════════════════════════════════════════════════ */

const ADRIANA_CORE = `You are Adriana, the host of Podside, the companion interview series for the podcast "Birth of a Parent" (a podcast about how becoming a parent transforms adults, its premise: when a baby is born, a parent is also born). The person you are speaking with has just listened to an episode, and now THEY are your guest. Your entire job is to interview them about their own lived experience of the episode's themes, exactly as a skilled podcast host would interview a guest.

THIS IS A LIVE VOICE CONVERSATION. Rules of speech:
- Speak naturally, warmly, conversationally. Short turns: usually 2–4 sentences.
- Ask exactly ONE question per turn. Never stack questions.
- No lists, no headings, no markdown, no stage directions. Only spoken words.
- Use the guest's name if they share it. React to what they actually said before moving on, reference their specific words, the way a good host does ("You said it has to be the blue cup, tell me about the blue cup").
- Brief verbal acknowledgements are good ("Mm, that lands", "That's exactly what Dimitris described"). Do not over-praise.

HOSTING CRAFT:
- Follow the EPISODE ARC below segment by segment, but flexibly: if the guest's answer naturally opens a later theme, follow them, then circle back.
- Open each new theme with a short hook from the episode, a moment, a quote, or a finding, then turn it into a question about THE GUEST'S life. The episode is the frame; the guest is the content.
- Ask follow-ups. One good follow-up on a real answer is worth more than moving to the next segment.
- If an answer is very short or hesitant, offer a gentler, more concrete version of the question. Never pressure.
- Keep rough time awareness: this should feel like a 15–25 minute episode. If the conversation is running long, move toward the closing segment gracefully.

HARD BOUNDARIES:
1. NO ADVICE. You never give parenting, medical, psychological, relationship, or any other advice, not even gentle suggestions dressed as questions. If the guest asks what they should do, say warmly that as the host you're there to draw out their story, not to advise, and you may recall, with attribution, something Dimitris or Michael said in the episode ("I can't tell you what to do, but Dimitris did say that..."), then return to interviewing.
2. STAY IN THE EPISODE. Every question must connect to this episode's themes. If the guest drifts to unrelated topics, acknowledge briefly and bridge back ("I want to bring us back to something in the episode..."). If they ask you about other topics, politely say this conversation stays with the episode.
3. NO FABRICATION. Only attribute to Dimitris Xygalatas or Michael Feigelson things that appear in the episode notes below. If asked about something not in the episode, say the episode didn't cover it.
4. WELLBEING OVERRIDE (this outranks rules 1–3): parenthood is tender ground. If the guest discloses real distress, crisis, hopelessness, harm, severe struggle, drop the interview format immediately. Respond as a caring human: acknowledge what they shared, don't probe for detail, don't give advice or diagnoses, and gently encourage them to talk to someone they trust or a professional. Ask if they'd like to continue the episode or leave it here, and honor their answer. Never use their disclosure as interview material.
5. Nothing is stored on any server. If a PREVIOUS SESSION TRANSCRIPT section appears below, the guest chose to continue an earlier conversation saved in their own browser, treat it as your shared history: reference what they told you naturally, do not re-ask answered questions, and continue the arc from where it left off. If no such section appears, this is a fresh episode; do not claim any memory of past sessions.
6. PAUSES: if you receive a contextual note that the guest has pressed pause, go completely silent, say nothing at all, no matter how long the silence lasts, until a note says they have returned. When they return, welcome them back in one warm short sentence and pick up exactly where you left off.
7. PRIVACY QUESTIONS: if the guest asks how their data is handled, answer plainly using ONLY these facts, then return to the interview: you are an AI host, not a person; their voice is processed in real time by ElevenLabs (speech and voice) and a language model (to generate your responses); no audio recording of them is stored; a text transcript is kept by ElevenLabs for up to 7 days to help improve the experience and is then deleted; a copy of the transcript is saved only in the guest's own browser on their device so they can pause and resume, and starting a new conversation erases it; nothing is sold or shared. If they ask something about data handling beyond these facts, say you don't want to guess and suggest they check the privacy note on the page. If they seem uncomfortable, offer warmly to end the episode, their comfort outranks the interview.

CLOSING THE EPISODE:
When the arc is complete (or the guest signals they're done), deliver a proper outro: reflect back two or three of the most vivid things THE GUEST said, in their own words where possible, no advice, no interpretation of their psychology, just the synthesis a host offers a guest. Thank them for being the guest. Mention what's next on Birth of a Parent if the episode notes include a teaser. Say a warm goodbye. If you have an end-call tool available, use it only after the goodbye has been fully spoken.`;

/* ════════════════════════════════════════════════════════════════
   EPISODE LIBRARY, prototype wires Episode 5 only
   ════════════════════════════════════════════════════════════════ */

const EPISODES = [
  { id: 1, slug: "the-parental-brain", title: "The Parental Brain", tag: "Neuroscience of becoming", live: false },
  { id: 2, slug: "attention-and-attunement", title: "Attention & Attunement", tag: "How parents learn to notice", live: false },
  { id: 3, slug: "fathers-and-biology", title: "Fathers & Biology", tag: "Testosterone, colic and calm", live: false },
  { id: 4, slug: "learning-at-high-velocity", title: "Learning at High Velocity", tag: "Adaptation after birth", live: false },
  {
    id: 5,
    slug: "ritual",
    title: "Ritual",
    tag: "Dimitris Xygalatas on why parents need ritual",
    live: true,
    duration: "≈ 20 min conversation",
  },
  { id: 6, slug: "embracing-the-unknown", title: "Embracing the Unknown", tag: "Lulu Miller on mystery", live: false },
];

const EPISODE_5_PROMPT = `
════════ EPISODE ARC, Episode 5: "Ritual" ════════
Guest of the original episode: Dimitris Xygalatas, anthropologist, field researcher, and one of the world's leading experts on ritual. Original host: Michael Feigelson. Your guest today is the listener.

Work through these segments in order (flexibly). Each segment lists the episode material you may draw on and the interviewing goal.

SEGMENT 1, WELCOME & THE GUEST ARRIVES
Goal: settle the guest in. After your first message, ask them to introduce themselves as a guest would, their name, and a little about their family or the children in their life (as parent, caregiver, or however they relate to the theme). Keep it light.

SEGMENT 2, A RITUAL OF YOUR OWN (the "papa, café" story)
Episode material: Dimitris starts every day with a coffee ritual, same process, very specific mug, and half the time he doesn't even drink the coffee. "It is the process that counts, not the outcome." His son, around age two, would protest if the ritual was skipped: pointing at the coffee maker, insisting "No, no, no. Papa, café, café", you just have to do it, that's what we do every morning. Michael's framing: someone decides a thing matters, not because it's efficient or logical, just because it is what we do, and something ordinary becomes sacred.
Goal: ask the guest about an everyday ritual in their own home, theirs or their child's. Follow up on its texture: the exact object, the exact order, who protests when it's skipped.

SEGMENT 3, RITUAL OR ROUTINE? (the ritual paradox)
Episode material: The "ritual paradox": across cultures people attribute tremendous significance to their rituals but can't justify why, ask what would happen if the ritual were skipped and they say, puzzled, "I don't know, something terrible." The defining features of ritual: no causal connection between the actions and the outcome, plus a layer of meaning, rituals demarcate something as special, and we get upset if they're disrupted. Michael's one-line distinction: "Routine is something we do. Ritual signals something matters." Also: Dimitris grew up in Greece with compulsory religious ritual, morning prayer with a point system, austere Orthodox services, which he found oppressive as a child; the arc from that child to the anthropologist asking why humans keep doing these things.
Goal: invite the guest to test their own example against the distinction. Which of their daily acts are routine, and which are ritual? What happens, honestly, when the ritual is disrupted? If it fits, ask about rituals they inherited as a child and whether they loved or resisted them.

SEGMENT 4, RITUAL UNDER UNCERTAINTY (the science)
Episode material: The predictive brain: the brain's main function is anticipating what happens next, so uncertainty is deeply stressful, and at times of high uncertainty and high stakes, people turn to ritual, because "if ritual is anything, it is structure. It is entirely predictable." Michael: ritual helps us feel in control when we're not and it's scary, which is why new parents become masters of ritual, and why a disrupted ritual can make a toddler feel unsafe while a bedtime story done "the way we do it" is so grounding. The evidence: Malinowski's Trobriand fishermen performed rituals before the dangerous open sea, not the calm lagoon. Lab studies: the more stressed people became, the more ritualized and repetitive their behavior. In Mauritius, performing temple rituals lowered physiological stress more than simply relaxing. Measures: heart rate variability (high = calmer; stress makes the heart beat like a metronome), electrodermal activity, cortisol in saliva and even hair. The fire-walking study: in a 600-person village, hearts of fire-walkers and local spectators synchronized, "collective effervescence", and the closer two people were socially, the greater the synchrony; the tourists' hearts didn't join in. For the locals it was sacred; for outsiders, a spectacle.
Goal: bring this home. Ask about a period of high uncertainty in the guest's parenting life, early newborn weeks, an illness, a move, and what they found themselves repeating. Have they ever felt that under-the-skin synchrony with their child or their family?

SEGMENT 5, THE MOMENT YOU WERE BORN AS A PARENT
Episode material: Dimitris's moment: walking into the house during the pandemic lockdown, holding his newborn son, "This is not the old me. Now I have a whole other world to worry about." Michael: you'd expect a collective ritual for such a transformation, but in much of the world "we mostly just get handed the baby and figure it out from there. Solo fire-walking, no collective effervescence." Dimitris on the missing rites of passage: societies mark major life transitions with ritual, yet almost none mark becoming a parent, losing those traditions can leave people baffled about their new role. His own answer: he'd never had a Christmas tree until his son was born; now there's always one, sometimes until February. The couvade: across cultures from Papua New Guinea to Honduras, fathers report pregnancy-like symptoms, and some traditions have the father take to bed after the birth, pampered by the community, a ritual that helps fathers internalize the new role. The Dutch birthday custom Michael noticed: guests congratulate the parents, not the child.
Goal: the emotional heart of the interview. Ask the guest to take you back to the moment they were born as a parent (or stepped into their caring role). Then: did anything, or anyone, mark that transition for them? Did they, like Dimitris, start reaching for rituals they'd never cared about before?

SEGMENT 6, SACRALIZING THE ORDINARY
Episode material: The sacred isn't only religious, family, country, a sports team can be sacred, and ritual is how we make them so: done with intention, mindfulness, and a signal that the act matters, same time, same way, with visible excitement, children pick this up instantly; "it's not a chore, it's a ritual." The pilgrimage study: identical actions (walking five miles to work vs. as a pilgrimage) are judged less effortful and more rewarding in a ritual context, and it motivates the parent too: "you're becoming the priest of your own ritual." Michael's mom and her end-of-day glass of wine at sunset ("as long as it works, I don't care" whether it's the ritual or the wine). The birthday study: children believe the party causes aging, skip the fifth birthday party and most kids say the child is still four. Children sense what adults forget: ritual isn't decoration, it's what tells you this matters. Dimitris's summary of what ritual solves for new parents: soothing our deepest anxieties, and connecting us to other people, the playdates and support that grow in the periphery of shared ritual.
Goal: ask which ordinary moment in the guest's family life they have, perhaps without noticing, turned sacred, or which one they now see they could. (Careful: if they ask HOW they should do it, that's advice territory, reflect the question back to their own instincts or quote Dimitris with attribution.)

SEGMENT 7, OUTRO
Reflect back the guest's most vivid moments in their own words. Thank them for being today's guest on the Birth of a Parent companion. Teaser you may use: next time on Birth of a Parent, Radiolab's Lulu Miller on the mystery at the heart of raising a child, and why some of the most important things in parenthood resist explanation altogether. Warm goodbye. Then, if available, end the call.
════════════════════════════════════════════════════`;

/*
 * Privacy is disclosed in WRITING on the studio page (the card above the
 * Begin button). Adriana identifies as an AI host in her greeting but does
 * not read the privacy details aloud; if asked, she answers from the facts
 * in rule 7 of her prompt. Keep the written card in sync with the
 * ElevenLabs dashboard settings (audio off, 7-day retention).
 */
const EPISODE_5_FIRST_MESSAGE =
  "Hello, and welcome. I'm Adriana, your AI host. This is Podside, the companion to Birth of a Parent, the part of the show where the microphone turns around, and you become the guest. You've just heard Dimitris Xygalatas make the case that new parents become masters of ritual, and today I want to hear about the rituals in your house. So, if you're happy to begin: who am I speaking with, and who are the little people in your life?";

const RESUME_FIRST_MESSAGE =
  "Welcome back to the studio. It's lovely to have you in the guest chair again. We were in the middle of our conversation about ritual, and I've kept my notes from last time. Whenever you're ready, shall we pick up where we left off?";

const buildOverrides = (episode, savedMessages) => {
  if (episode.id !== 5) return null;
  let prompt = ADRIANA_CORE + "\n" + EPISODE_5_PROMPT;
  let firstMessage = EPISODE_5_FIRST_MESSAGE;

  if (savedMessages && savedMessages.length > 0) {
    // Keep the injected history affordable: last 40 turns, ~9000 chars max
    const recent = savedMessages.slice(-40);
    let text = recent
      .map((m) => `${m.source === "user" ? "GUEST" : "ADRIANA"}: ${m.text}`)
      .join("\n");
    if (text.length > 9000) text = "…\n" + text.slice(-9000);
    prompt +=
      "\n\n════════ PREVIOUS SESSION TRANSCRIPT ════════\n" +
      "The guest paused this episode earlier and has now returned. This is what was said before:\n\n" +
      text +
      "\n════════ END OF PREVIOUS SESSION ════════\n" +
      "Continue the episode from this point in the arc. Do not repeat questions the guest has already answered; you may briefly recall one thing they said to re-anchor the conversation.";
    firstMessage = RESUME_FIRST_MESSAGE;
  }

  return {
    agent: {
      prompt: { prompt },
      firstMessage,
      language: "en",
    },
  };
};

/* ── Saved-session helpers (browser localStorage only, nothing leaves the device) ── */
const storeKey = (epId) => `adriana-ep${epId}-session`;
const loadSaved = (epId) => {
  try {
    const raw = localStorage.getItem(storeKey(epId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    return Array.isArray(data?.messages) && data.messages.length > 0 ? data : null;
  } catch {
    return null;
  }
};
const saveSession = (epId, messages) => {
  try {
    if (messages.length === 0) return;
    localStorage.setItem(
      storeKey(epId),
      JSON.stringify({ messages: messages.slice(-80), savedAt: new Date().toISOString() })
    );
  } catch {
    /* storage full or unavailable, resume simply won't be offered */
  }
};
const clearSaved = (epId) => {
  try {
    localStorage.removeItem(storeKey(epId));
  } catch {
    /* ignore */
  }
};

/* ════════════════════════════════════════════════════════════════
   UI
   ════════════════════════════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,340;0,9..144,540;0,9..144,640;1,9..144,420&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,800&display=swap');

:root{
  --ink:#231a30;          /* deep ink-plum, the studio at dusk */
  --ink-2:#2e2340;
  --ink-3:#3a2d4f;
  --candle:#f0a35e;       /* candlelight amber, the on-air glow */
  --candle-soft:#f6c99a;
  --rose:#c98a9e;
  --cream:#f6efe6;
  --cream-dim:#cfc3d6;
  --line:rgba(246,239,230,.14);
}
*{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%}
body{background:var(--ink);color:var(--cream);font-family:'Nunito Sans',system-ui,sans-serif;
  -webkit-font-smoothing:antialiased}
button{font-family:inherit;cursor:pointer}
:focus-visible{outline:2px solid var(--candle);outline-offset:3px;border-radius:4px}

.shell{min-height:100%;display:flex;flex-direction:column;
  background:
    radial-gradient(1200px 700px at 78% -10%, rgba(240,163,94,.10), transparent 60%),
    radial-gradient(900px 600px at 8% 110%, rgba(201,138,158,.10), transparent 55%),
    var(--ink)}

.masthead{padding:34px clamp(20px,6vw,64px) 10px}
.eyebrow{font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:var(--candle)}
.masthead h1{font-family:'Fraunces',serif;font-weight:340;font-size:clamp(34px,5.5vw,56px);
  line-height:1.04;margin-top:10px;letter-spacing:-.01em}
.masthead h1 em{font-style:italic;font-weight:420;color:var(--candle-soft)}
.masthead p{max-width:560px;margin-top:14px;color:var(--cream-dim);font-size:15px;line-height:1.65}

.feed{padding:28px clamp(20px,6vw,64px) 64px;display:grid;gap:12px;max-width:860px}
.ep{display:flex;align-items:center;gap:18px;text-align:left;width:100%;
  padding:18px 20px;border:1px solid var(--line);border-radius:16px;background:rgba(246,239,230,.03);
  color:var(--cream);transition:border-color .2s,background .2s,transform .2s}
.ep[data-live="true"]:hover{border-color:var(--candle);background:rgba(240,163,94,.07);transform:translateY(-1px)}
.ep[data-live="false"]{opacity:.42;cursor:default}
.ep .num{font-family:'Fraunces',serif;font-style:italic;font-size:26px;color:var(--candle);
  min-width:44px;text-align:center}
.ep .meta{flex:1}
.ep .meta h3{font-family:'Fraunces',serif;font-weight:540;font-size:19px;letter-spacing:.01em}
.ep .meta span{display:block;margin-top:3px;font-size:13px;color:var(--cream-dim)}
.ep .cta{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:var(--ink);background:var(--candle);padding:9px 14px;border-radius:999px;white-space:nowrap}
.ep .soon{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--cream-dim)}

/* ── Landing ────────────────────────────────────── */
:root{--navy:#24305e;--paper:#ffffff;--paper-dim:#6a6a78}
.chapter-light{color:var(--ink);
  background:
    radial-gradient(640px 460px at 10% 14%, rgba(240,163,94,.26), transparent 62%),
    radial-gradient(720px 540px at 92% 58%, rgba(201,138,158,.24), transparent 62%),
    radial-gradient(560px 420px at 72% 6%, rgba(36,48,94,.12), transparent 60%),
    var(--paper)}
.hero-lite{max-width:820px;margin:0 auto;text-align:center;padding:104px 20px 92px}
.hero-lite h1{font-family:'Fraunces',serif;font-weight:340;
  font-size:clamp(42px,7vw,76px);line-height:1.04;letter-spacing:-.015em;margin-top:22px}
.hero-lite h1 em{font-style:italic;font-weight:420;color:var(--navy)}
.hero-lite .eyebrow{color:var(--navy)}
.brandmark{display:inline-block;font-family:'Fraunces',serif;font-style:italic;
  font-weight:540;font-size:18px;color:var(--cream);letter-spacing:.01em;
  background:#121016;padding:7px 18px 9px;border:none;line-height:1.2}
.brandmark.hero{font-size:26px;padding:9px 24px 12px}
button.brandmark{cursor:pointer}
.showtop{max-width:1060px;margin:0 auto;padding:24px clamp(20px,6vw,64px) 0;text-align:left}
.show-hero{max-width:1060px;margin:0 auto;display:grid;grid-template-columns:210px 1fr;
  gap:32px;align-items:center;padding:36px clamp(20px,6vw,64px) 58px;text-align:left}
.show-cover{width:210px;height:210px;object-fit:cover;display:block}
.show-title{font-family:'Fraunces',serif;font-weight:340;
  font-size:clamp(30px,4.5vw,48px);line-height:1.05;letter-spacing:-.015em;margin-top:10px}
.show-hero .host{font-family:'Fraunces',serif;font-style:italic;font-weight:420;
  font-size:15px;color:#b3641f;display:block;margin-top:8px}
.show-hero .lede{max-width:560px;margin:14px 0 0;color:var(--paper-dim);
  font-size:15px;line-height:1.7;text-align:left}
@media (max-width:700px){.show-hero{grid-template-columns:1fr;text-align:center}
  .show-cover{margin:0 auto}.show-hero .lede{margin-inline:auto}}
.hero-lite .lede{max-width:600px;margin:22px auto 0;color:var(--paper-dim);
  font-size:16px;line-height:1.7;text-align:left}
.hero-lite .lede b{color:var(--ink);font-weight:600}
.hero-lite .hero-cta{margin-top:28px;display:flex;gap:14px;align-items:center;
  justify-content:center;flex-wrap:wrap}
.hero-note{font-size:12px;color:var(--paper-dim);letter-spacing:.02em}


.landing{padding:8px clamp(20px,6vw,64px) 72px;max-width:1060px;margin:0 auto;width:100%}


.shows{margin-top:48px}
.shows>.eyebrow{display:block;margin-bottom:18px}
.show-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
.show-card{display:flex;flex-direction:column;text-align:left;border:1px solid var(--line);
  border-radius:20px;overflow:hidden;background:rgba(246,239,230,.03);color:var(--cream);
  transition:border-color .2s,transform .2s,background .2s}
.show-card:hover{border-color:var(--candle);transform:translateY(-2px);
  background:rgba(240,163,94,.06)}
.cover{aspect-ratio:1/1;position:relative;
  background:
    radial-gradient(120% 130% at 82% 0%, rgba(240,163,94,.55), transparent 55%),
    radial-gradient(110% 120% at 0% 100%, rgba(201,138,158,.4), transparent 60%),
    linear-gradient(160deg, var(--ink-3), var(--ink-2))}
.cover-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.show-body h3{font-family:'Fraunces',serif;font-weight:540;font-size:17px;line-height:1.15}
.show-body .host{font-family:'Fraunces',serif;font-style:italic;font-weight:420;
  font-size:13px;color:var(--candle-soft)}
.show-body{padding:14px 16px 16px;display:flex;flex-direction:column;gap:9px;flex:1}
.show-body p{font-size:12px;color:var(--cream-dim);line-height:1.6}
.show-meta{font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--rose)}
.show-body .cta{align-self:flex-start;margin-top:auto;font-size:10px;font-weight:800;
  letter-spacing:.14em;text-transform:uppercase;color:var(--ink);background:var(--candle);
  padding:8px 13px;border-radius:999px}
.show-card.ghost{border-style:dashed;background:transparent;justify-content:center;
  align-items:center;text-align:center;padding:22px 18px;gap:8px;cursor:default}
.show-card.ghost:hover{transform:none;border-color:var(--line);background:transparent}
.show-card.ghost .n{font-family:'Fraunces',serif;font-style:italic;font-size:24px;
  color:var(--cream-dim)}
.show-card.ghost p{font-size:11.5px;color:var(--cream-dim);line-height:1.6;max-width:200px}
.foot{margin-top:64px;border-top:1px solid var(--line);padding-top:18px;
  font-size:11.5px;color:var(--cream-dim);display:flex;justify-content:space-between;
  gap:12px;flex-wrap:wrap}


.studio{flex:1;display:flex;flex-direction:column;align-items:center;
  padding:26px clamp(18px,5vw,48px) 30px}
.studio-top{width:100%;max-width:760px;display:flex;justify-content:space-between;align-items:center}
.back{background:none;border:none;color:var(--cream-dim);font-size:13px;font-weight:600;
  display:flex;gap:8px;align-items:center;padding:8px 4px}
.back:hover{color:var(--cream)}
.onair{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:800;
  letter-spacing:.22em;text-transform:uppercase}
.onair i{width:8px;height:8px;border-radius:50%;background:var(--cream-dim);display:inline-block}
.onair[data-live="true"]{color:var(--candle)}
.onair[data-live="true"] i{background:var(--candle);animation:blink 1.6s ease infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}

.stage{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:26px;width:100%;max-width:760px;text-align:center}
.ep-title{font-family:'Fraunces',serif;font-weight:340;font-size:clamp(24px,3.6vw,34px)}
.ep-title em{font-style:italic;color:var(--candle-soft)}

.orb-wrap{position:relative;width:min(46vw,230px);height:min(46vw,230px)}
.orb{position:absolute;inset:0;border-radius:50%;
  background:radial-gradient(circle at 38% 32%, var(--candle-soft) 0%, var(--candle) 34%, #a4562b 78%, #6e3a22 100%);
  box-shadow:0 0 60px rgba(240,163,94,.35), 0 0 140px rgba(240,163,94,.18);
  transition:transform .08s linear, box-shadow .3s ease}
.orb[data-state="listening"]{filter:saturate(.75) brightness(.9)}
.orb[data-state="idle"]{filter:saturate(.45) brightness(.72)}
.halo{position:absolute;inset:-14%;border-radius:50%;border:1px solid rgba(240,163,94,.25);
  animation:breathe 5s ease-in-out infinite}
@keyframes breathe{0%,100%{transform:scale(.97);opacity:.5}50%{transform:scale(1.03);opacity:1}}
@media (prefers-reduced-motion:reduce){
  .halo{animation:none}
  .onair[data-live="true"] i{animation:none}
}

.state-line{font-size:12px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--cream-dim)}
.caption{min-height:76px;max-width:620px;font-family:'Fraunces',serif;font-weight:340;
  font-size:clamp(16px,2.4vw,20px);line-height:1.55;color:var(--cream)}
.caption .who{display:block;font-family:'Nunito Sans';font-size:10px;font-weight:800;
  letter-spacing:.22em;text-transform:uppercase;color:var(--candle);margin-bottom:8px}

.controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:center}
.btn{border:none;border-radius:999px;padding:15px 30px;font-size:14px;font-weight:800;
  letter-spacing:.04em}
.btn-primary{background:var(--candle);color:var(--ink)}
.btn-primary:hover{background:var(--candle-soft)}
.btn-primary:disabled{opacity:.55;cursor:wait}
.btn-ghost{background:transparent;color:var(--cream-dim);border:1px solid var(--line)}
.btn-ghost:hover{color:var(--cream);border-color:var(--cream-dim)}
.hint{font-size:12.5px;color:var(--cream-dim);max-width:460px;line-height:1.6}
.hint.privacy{max-width:560px;font-size:11.5px;border:1px solid var(--line);
  border-radius:12px;padding:12px 16px;text-align:left;background:rgba(246,239,230,.03)}
.hint.privacy b{color:var(--cream);font-weight:800;letter-spacing:.06em;font-size:10.5px;
  text-transform:uppercase;display:block;margin-bottom:4px}
.err{font-size:13px;color:#f2b8a0;max-width:520px;line-height:1.6}

.log{width:100%;max-width:640px;margin-top:8px;border-top:1px solid var(--line);
  max-height:220px;overflow-y:auto;padding:16px 4px;text-align:left;display:grid;gap:12px}
.log p{font-size:13.5px;line-height:1.6;color:var(--cream-dim)}
.log p b{display:block;font-size:10px;font-weight:800;letter-spacing:.2em;
  text-transform:uppercase;color:var(--candle);margin-bottom:2px}
`;

/* The on-air orb, swells with Adriana's real voice frequencies,
   flickers gently with the guest's mic level while listening. */
function Orb({ conversation, active }) {
  const orbRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    let raf;
    const tick = () => {
      const el = orbRef.current;
      if (el) {
        let energy = 0;
        try {
          if (conversation.isSpeaking) {
            const d = conversation.getOutputByteFrequencyData?.();
            if (d?.length) {
              let s = 0;
              for (let i = 0; i < d.length; i++) s += d[i];
              energy = s / d.length / 255;
            }
          } else {
            energy = (conversation.getInputVolume?.() || 0) * 0.5;
          }
        } catch {
          /* not ready yet */
        }
        const scale = 1 + Math.min(energy * 0.5, 0.28);
        el.style.transform = `scale(${scale})`;
        el.style.boxShadow = `0 0 ${60 + energy * 110}px rgba(240,163,94,${0.3 + energy * 0.4}), 0 0 140px rgba(240,163,94,.18)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, conversation]);

  // When inactive (idle or paused) the orb settles back to rest
  useEffect(() => {
    if (!active && orbRef.current) {
      orbRef.current.style.transform = "scale(1)";
      orbRef.current.style.boxShadow = "0 0 60px rgba(240,163,94,.35), 0 0 140px rgba(240,163,94,.18)";
    }
  }, [active]);

  const state = !active ? "idle" : conversation.isSpeaking ? "speaking" : "listening";
  return (
    <div className="orb-wrap" aria-hidden="true">
      <div className="halo" />
      <div ref={orbRef} className="orb" data-state={state} />
    </div>
  );
}

function Studio({ episode, onLeave }) {
  const [saved] = useState(() => loadSaved(episode.id));
  const [resumeMode, setResumeMode] = useState(null); // null | "fresh" | "resume"
  const [messages, setMessages] = useState([]);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const logRef = useRef(null);

  const overrides = useMemo(
    () => buildOverrides(episode, resumeMode === "resume" ? saved?.messages : null),
    [episode, resumeMode, saved]
  );

  const conversation = useConversation({
    overrides,
    onMessage: (m) => {
      const text = m?.message ?? m?.text ?? "";
      const source = m?.source ?? m?.role ?? "ai";
      if (!text) return;
      setMessages((prev) => {
        // Replace tentative user transcriptions with the latest version
        const last = prev[prev.length - 1];
        if (last && last.source === source && m?.tentative) {
          return [...prev.slice(0, -1), { source, text }];
        }
        return [...prev, { source, text }];
      });
    },
    onError: (e) => setError(typeof e === "string" ? e : "Something interrupted the connection. You can start the episode again."),
    onDisconnect: () => setStarting(false),
  });

  const connected = conversation.status === "connected";

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Autosave the transcript to this browser as the conversation unfolds,
  // so "resume later" works even if the tab is closed abruptly.
  useEffect(() => {
    if (messages.length === 0) return;
    const base = resumeMode === "resume" && saved?.messages ? saved.messages : [];
    saveSession(episode.id, [...base, ...messages]);
  }, [messages, episode.id, resumeMode, saved]);

  const begin = async (mode) => {
    setResumeMode(mode);
    if (mode === "fresh") clearSaved(episode.id);
    setError(null);
    setStarting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      // Let React apply the overrides for the chosen mode before connecting
      await new Promise((r) => setTimeout(r, 50));
      await conversation.startSession({ agentId: AGENT_ID });
    } catch (e) {
      setError(
        e?.name === "NotAllowedError"
          ? "Adriana needs your microphone to record the conversation. Allow microphone access in your browser, then press Begin again."
          : "Couldn't reach the studio. Check that the agent id is set and the agent is public, then try again."
      );
    } finally {
      setStarting(false);
    }
  };

  const pause = async () => {
    setPaused(true);
    try {
      conversation.setMuted?.(true);
      await conversation.setVolume?.({ volume: 0 });
      conversation.sendContextualUpdate?.(
        "The guest has pressed pause and stepped away. Stay completely silent until they return. Do not speak."
      );
    } catch { /* non-fatal */ }
  };

  const resume = async () => {
    setPaused(false);
    try {
      conversation.setMuted?.(false);
      await conversation.setVolume?.({ volume: 1 });
      conversation.sendContextualUpdate?.(
        "The guest has returned from the pause. Welcome them back in one short warm sentence and continue where you left off."
      );
    } catch { /* non-fatal */ }
  };

  const leave = async () => {
    try {
      if (connected) await conversation.endSession();
    } finally {
      onLeave();
    }
  };

  const fmtDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const lastAgentLine = [...messages].reverse().find((m) => m.source !== "user");

  return (
    <div className="studio">
      <div className="studio-top">
        <button className="back" onClick={leave}>← All episodes</button>
        <div className="onair" data-live={connected}>
          <i /> {connected ? "On air" : "Off air"}
        </div>
      </div>

      <div className="stage">
        <div>
          <div className="eyebrow">Episode {episode.id} · Companion session</div>
          <h2 className="ep-title"><em>{episode.title}</em>, you're the guest</h2>
        </div>

        <Orb conversation={conversation} active={connected && !paused} />

        <div className="state-line" role="status">
          {connected
            ? paused ? "Paused. Adriana is waiting for you"
              : conversation.isSpeaking ? "Adriana is speaking" : "Adriana is listening, just talk"
            : starting ? "Walking into the studio…" : "The studio is quiet"}
        </div>

        {connected && !paused && (
          <div className="caption" aria-live="polite">
            {lastAgentLine ? (<><span className="who">Adriana</span>{lastAgentLine.text}</>) : "…"}
          </div>
        )}

        {!connected && (
          <>
            <p className="hint">
              This is a hands-free conversation. Once you begin, Adriana will welcome
              you and ask questions about the episode. Answer out loud, in your own
              time.
            </p>
            <p className="hint privacy">
              <b>How your data is handled:</b> Adriana is an AI host. Your voice is
              processed in real time by ElevenLabs and a language model so she can hear
              and respond. No audio recording of you is stored. A text transcript is
              retained by ElevenLabs for up to 7 days to help improve the experience,
              then deleted. A copy of the transcript is saved only in this browser, on
              this device, so you can pause and resume. Starting a new conversation
              erases it. Nothing is sold or shared. By beginning, you're okay with this.
            </p>
          </>
        )}

        {error && <p className="err" role="alert">{error}</p>}

        <div className="controls">
          {!connected ? (
            saved ? (
              <>
                <button className="btn btn-primary" onClick={() => begin("resume")} disabled={starting}>
                  {starting ? "Connecting…" : `Continue from ${fmtDate(saved.savedAt)}`}
                </button>
                <button className="btn btn-ghost" onClick={() => begin("fresh")} disabled={starting}>
                  Start a new conversation
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => begin("fresh")} disabled={starting}>
                {starting ? "Connecting…" : "Begin the conversation"}
              </button>
            )
          ) : (
            <>
              {paused ? (
                <button className="btn btn-primary" onClick={resume}>Resume</button>
              ) : (
                <button className="btn btn-ghost" onClick={pause}>Pause</button>
              )}
              <button className="btn btn-ghost" onClick={leave}>End the episode</button>
            </>
          )}
        </div>

        {connected && paused && (
          <p className="hint">
            Adriana is holding the line quietly. For a short break this is perfect.
            For a longer one, press "End the episode" instead: your conversation is
            already saved in this browser, and she'll offer to continue next time.
          </p>
        )}

        {messages.length > 0 && (
          <div className="log" ref={logRef} aria-label="Conversation transcript">
            {messages.map((m, i) => (
              <p key={i}><b>{m.source === "user" ? "You" : "Adriana"}</b>{m.text}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SHOWS REGISTRY
   Each show carries its own slug (the URL), host persona, cover and
   episode list. Adding a future show = one new object here, plus its
   host's prompt material and (optionally) its own agentId.
   ════════════════════════════════════════════════════════════════ */

const SHOWS = [
  {
    slug: "birth-of-a-parent",
    title: "Birth of a Parent",
    host: "adriana",
    org: "Van Leer Foundation",
    meta: "Van Leer Foundation · Parenthood · 12 episodes",
    blurb:
      "When a baby is born, a parent is also born. How parenthood transforms adults, with scientists, anthropologists and writers.",
    cover: "/birth-of-a-parent.jpg",
    agentId: AGENT_ID,
    episodes: EPISODES,
  },
];

function SiteLogo({ hero, onClick }) {
  const cls = "brandmark" + (hero ? " hero" : "");
  return onClick ? (
    <button className={cls} onClick={onClick} aria-label="podside home">podside</button>
  ) : (
    <span className={cls}>podside</span>
  );
}

function Landing({ onOpenShow }) {
  return (
    <>
      <section className="chapter-light">
        <div className="hero-lite">
          <SiteLogo hero />
          <h1>Today's guest is <em>you</em>.</h1>
          <p className="lede">
            Podside trains advanced AI companion hosts on every word of a show,
            faithful to how its real host thinks and asks. The result is a new
            way to immerse yourself in a podcast: when the episode ends, its
            host interviews <b>you</b>, hands-free, voice to voice, grounded
            strictly in the episodes. From passive listening to active
            conversation.
          </p>
          <div className="hero-cta">
            <button
              className="btn btn-primary"
              onClick={() => {
                try {
                  document.getElementById("shows")?.scrollIntoView({ behavior: "smooth" });
                } catch { /* ignore */ }
              }}
            >
              Be the guest
            </button>
          </div>
        </div>
      </section>
      <div className="landing">
      <section className="shows" id="shows">
        <span className="eyebrow">In the studio now</span>
        <div className="show-grid">
          {SHOWS.map((show) => (
            <button key={show.slug} className="show-card" onClick={() => onOpenShow(show)}>
              <div className="cover">
                <img
                  className="cover-img"
                  src={show.cover}
                  alt={`${show.title} cover art`}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              </div>
              <div className="show-body">
                <h3>{show.title}</h3>
                <span className="host">Your host: {show.host}</span>
                <span className="show-meta">{show.meta}</span>
                <p>{show.blurb}</p>
                <span className="cta">Be the guest</span>
              </div>
            </button>
          ))}
          <div className="show-card ghost">
            <div className="n">…</div>
            <p>More shows soon</p>
          </div>
          <div className="show-card ghost">
            <div className="n">…</div>
            <p>More shows soon</p>
          </div>
          <div className="show-card ghost">
            <div className="n">…</div>
            <p>More shows soon</p>
          </div>
        </div>
      </section>

      <footer className="foot">
        <span>Podside hosts are AI. Conversations are voice-processed in real time; details on each studio page.</span>
        <span>podside. The other side of the mic.</span>
      </footer>
      </div>
    </>
  );
}

/* The show page: podside.ai/<show-slug>
   Same two-chapter look as the homepage: light hero (logo, cover,
   title, host byline, invitation), then the dusk episode list. */
function ShowPage({ show, onOpenEpisode, onHome }) {
  return (
    <>
      <section className="chapter-light">
        <div className="showtop"><SiteLogo onClick={onHome} /></div>
        <div className="show-hero">
          <img
            className="show-cover"
            src={show.cover}
            alt={`${show.title} cover art`}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          <div>
            <div className="eyebrow">{show.org} · Podcast companion</div>
            <h1 className="show-title">{show.title}</h1>
            <span className="host">Your host: {show.host}</span>
            <p className="lede">
              You've listened. Now you're the guest. Choose an episode you've
              heard, and {show.host} will interview you about your own
              experience of its ideas, voice to voice, like a real recording
              session.
            </p>
          </div>
        </div>
      </section>
      <main className="feed">
        {show.episodes.map((ep) => (
          <button
            key={ep.id}
            className="ep"
            data-live={ep.live}
            disabled={!ep.live}
            onClick={() => ep.live && onOpenEpisode(ep)}
          >
            <span className="num">{ep.id}</span>
            <span className="meta">
              <h3>{ep.title}</h3>
              <span>{ep.tag}{ep.duration ? ` · ${ep.duration}` : ""}</span>
            </span>
            {ep.live ? <span className="cta">Be the guest</span> : <span className="soon">Soon</span>}
          </button>
        ))}
      </main>
    </>
  );
}

/* ── Router: real URLs, no library ──
   "/"                          → Landing
   "/<show-slug>"               → ShowPage      e.g. /birth-of-a-parent
   "/<show-slug>/<episode-slug>"→ Studio        e.g. /birth-of-a-parent/ritual
   Unknown paths fall back to the Landing page.
   Netlify serves index.html for every path via the redirect rule in
   netlify.toml, so deep links and refreshes work. */
function usePath() {
  const read = () => {
    try { return window.location.pathname || "/"; } catch { return "/"; }
  };
  const [path, setPath] = useState(read);
  useEffect(() => {
    const onPop = () => setPath(read());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = (to) => {
    try { window.history.pushState({}, "", to); } catch { /* sandboxed preview */ }
    setPath(to);
    try { window.scrollTo(0, 0); } catch { /* ignore */ }
  };
  return [path, navigate];
}

export default function App() {
  const [path, navigate] = usePath();
  const segs = path.split("/").filter(Boolean);
  const show = SHOWS.find((s) => s.slug === segs[0]) || null;
  const episode =
    (show && segs[1] && show.episodes.find((e) => e.slug === segs[1] && e.live)) || null;

  useEffect(() => {
    try {
      document.title = episode
        ? `${episode.title} · ${show.title} · podside`
        : show
        ? `${show.title} · podside`
        : "podside · you are the guest";
    } catch { /* ignore */ }
  }, [show, episode]);

  return (
    <ConversationProvider>
      <style>{CSS}</style>
      <div className="shell">
        {episode ? (
          <Studio episode={episode} onLeave={() => navigate(`/${show.slug}`)} />
        ) : show ? (
          <ShowPage
            show={show}
            onOpenEpisode={(ep) => navigate(`/${show.slug}/${ep.slug}`)}
            onHome={() => navigate("/")}
          />
        ) : (
          <Landing onOpenShow={(s) => navigate(`/${s.slug}`)} />
        )}
      </div>
    </ConversationProvider>
  );
}
