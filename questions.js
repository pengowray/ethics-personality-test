/* ==================================================================== *
 *  Your Moral Compass  -  data layer
 *
 *  MC_AXES       the five bipolar axes of the compass
 *  MC_ARCHETYPES the gated moral "types" shown at the end
 *  MC_QUESTIONS  the questions: vignettes (a cast of specific people who
 *                each act) and probes (meta-ethical positions). The reader
 *                picks whose move / reading / response is theirs, or, on
 *                "multi" asks, marks every view they could argue.
 *
 *  Axis sign convention: each character's `axes` map gives signed loadings
 *  in roughly [-1, +1]. Negative pulls toward poleA, positive toward poleB.
 * ==================================================================== */

window.MC_AXES = [
  { key: 'decide', name: 'How you decide',        poleA: 'Consequences', poleB: 'Principles',
    blurbA: 'rightness is about outcomes', blurbB: 'some duties hold whatever the outcome',
    accent: '#A12B53' },
  { key: 'arrive', name: 'How you arrive',        poleA: 'Gut',          poleB: 'Reasoned',
    blurbA: 'the verdict comes first, as a feeling', blurbB: 'the verdict is argued out',
    accent: '#993C1D' },
  { key: 'counts', name: 'What even counts',      poleA: 'Harm-focused', poleB: 'Sacred values',
    blurbA: 'only harm and fairness are moral', blurbB: 'loyalty, authority and purity are too',
    accent: '#854F0B' },
  { key: 'reach',  name: 'How far it reaches',    poleA: 'Universal',    poleB: 'Relative',
    blurbA: 'one standard for everyone', blurbB: 'standards are bound to a culture',
    accent: '#4D7C0F' },
  { key: 'source', name: 'Where it comes from',   poleA: 'Discovered',   poleB: 'Invented',
    blurbA: 'moral facts are found (realism)', blurbB: 'morality is made by us (anti-realism)',
    accent: '#0F6E56' }
];

/* Archetypes. `target` is a sparse vector over axis keys; the engine scores
 * each archetype by how close your compass sits to it (dot product, length
 * normalised), then applies any `gate` (a function of the tallies) so the
 * rarer types only surface for a profile that earns them. */
window.MC_ARCHETYPES = [
  { key: 'cartographer', name: 'The Cartographer',
    target: { source: +0.9, arrive: +0.7, reach: +0.6 },
    blurb: 'Morality is a map you drew, not territory you found.',
    portrait:
      "You treat right and wrong as something built rather than discovered: a set of tools we " +
      "made, for creatures like us, that could have been drawn otherwise. That does not leave you " +
      "cold. A map you drew is still the map you steer by, and you would defend a good one fiercely. " +
      "You just decline to pretend the lines were always there in the rock.\n\n" +
      "The risk is a kind of altitude sickness: from high enough up every border looks arbitrary, " +
      "and it gets tempting to mistake 'we invented this' for 'this does not matter'. The people who " +
      "drew the map were steering around real cliffs." },

  { key: 'auditor', name: 'The Auditor',
    target: { decide: -0.9, arrive: +0.6 },
    blurb: 'Show your working. The numbers have to add up.',
    portrait:
      "You run the ledger to the end. An act is worth its effects, you are willing to follow that " +
      "to conclusions that make other people flinch, and you would rather be right and uncomfortable " +
      "than comfortable and wrong. Five lives outweigh one, and you can say so out loud.\n\n" +
      "What the ledger does not price easily is the thing that makes others trust you: a person who " +
      "keeps a promise only when it pays is running a different program from one who keeps it full " +
      "stop, and people can tell. Some of your hardest disagreements are not about the maths. They " +
      "are about what refused to go on the spreadsheet." },

  { key: 'lawgiver', name: 'The Lawgiver',
    target: { decide: +0.9, reach: -0.7, source: -0.6 },
    blurb: 'Some things are simply not done, by anyone, ever.',
    portrait:
      "There are lines for you that no outcome buys back. Use a person merely as a means, break a " +
      "promise because it suited you, and you have done something wrong even if the heavens fall the " +
      "other way. You suspect that a morality you can talk yourself out of when the stakes get high " +
      "was never really a morality.\n\n" +
      "The cost is rigidity in a world that keeps presenting cases your rules did not foresee, and a " +
      "temptation to treat 'I cannot bring myself to do it' as if it were already an argument. " +
      "Sometimes it is. Sometimes it is just the rule, holding on past its reason." },

  { key: 'anthropologist', name: 'The Anthropologist',
    target: { reach: +0.9, source: +0.7, counts: +0.3 },
    blurb: 'Every table thinks its manners are the floor of the world.',
    portrait:
      "You watch moralities the way a fluent traveller watches customs: as living systems that feel " +
      "like bedrock from the inside and like one option among many from the outside. You are slow to " +
      "call a stranger's norm an error, because you have felt how total your own feels and noticed it " +
      "is local too.\n\n" +
      "The danger is the spectator's chair. If every norm is just another culture's furniture, it gets " +
      "hard to stand up and say that a particular piece of it is crushing someone, which is sometimes " +
      "exactly the thing that needs saying." },

  { key: 'humanist', name: 'The Humanist',
    target: { counts: -0.9, reach: -0.6, source: -0.3 },
    blurb: 'The question is always: who is being hurt, and do they count?',
    portrait:
      "Strip the ceremony away and morality, for you, comes down to suffering and who is made to bear " +
      "it. Loyalty, purity, tradition: fine, until they cost a real person something, and then they go " +
      "in the bin. Your circle of who counts is wide and still expanding, and you apply it to strangers " +
      "and foreigners as readily as to your own.\n\n" +
      "Your blind spot is everyone who is plainly moved by things that harm no one: the flag, the grave, " +
      "the oath. You can call that irrational, but it is most of the human race, and the binding it does " +
      "is real even when the victim is hard to name." },

  { key: 'sentinel', name: 'The Sentinel',
    target: { counts: +0.9, decide: +0.5, reach: -0.4 },
    blurb: 'Some things are sacred, and a world that forgets it pays.',
    portrait:
      "You feel the full moral keyboard, not just the harm note: loyalty, respect, sanctity, the weight " +
      "of an oath and a flag and a threshold. To you a society that can only see harm has gone partly " +
      "deaf, and is busy dissolving the bonds it will wish it had kept.\n\n" +
      "The shadow is that sacred values resist arithmetic by design, which makes them easy to weaponise " +
      "and hard to revise. The same reflex that guards what should be guarded can defend a fence long " +
      "after the thing it protected has rotted away." },

  { key: 'sentimentalist', name: 'The Sentimentalist',
    target: { arrive: -0.9, counts: -0.3 },
    blurb: 'You feel the verdict land, then go looking for the reasons.',
    portrait:
      "For you the judgment arrives as feeling, fast and bodily, and the arguments come afterward to " +
      "explain a thing you already knew. You are in good and ancient company (this is roughly Hume's " +
      "picture, reason as the servant of the passions), and your instincts are often quietly wiser than " +
      "the people busily reasoning their way to monstrous conclusions.\n\n" +
      "The catch is that a fast feeling and a deep truth are easy to confuse, and disgust in particular " +
      "has sent a lot of confident verdicts to the wrong address. The gut is a compass, not a map." },

  { key: 'skeptic', name: 'The Skeptic',
    target: {},
    gate: function (t) { return t.agnostic >= Math.max(3, t.answered * 0.25); },
    blurb: 'You suspend judgment where others rush to a verdict.',
    portrait:
      "Where most people produce an answer, you produce a careful 'not yet'. You have noticed how much " +
      "moral confidence outruns its evidence, and you would rather hold the question open than close it " +
      "for comfort. In a culture of hot takes this is close to a discipline.\n\n" +
      "Held too hard, suspension becomes its own dodge: at some point you have to put weight on a plank " +
      "to find out if it holds, and the person who never commits never finds out anything. Doubt is a " +
      "tool, not a address." },

  { key: 'nihilist', name: 'The Error Theorist',
    target: { source: +0.8 },
    gate: function (t) { return t.nofact >= Math.max(2, t.answered * 0.15); },
    blurb: 'The questions have no true answers. You stopped pretending they do.',
    portrait:
      "You keep reaching for the same move: there is no fact of the matter here. Not 'I do not know' " +
      "but 'there is nothing to know'. On this view our moral talk is a vast, sincere, useful error, " +
      "everyone confidently reporting facts that are not there (this is roughly Mackie's error theory). " +
      "It is a clean, brave place to stand.\n\n" +
      "It is also a cold one, and hard to actually live from: you will go on being outraged by cruelty " +
      "like everyone else, and the interesting question becomes what to do with a feeling you have " +
      "officially declared to be about nothing." }
];

/* -------------------------------------------------------------------- *
 *  Questions
 * -------------------------------------------------------------------- */
window.MC_QUESTIONS = [

  /* 1 ----------------------------------------------------------------- */
  { id: 1, kind: 'vignette', topic: 'The photo',
    ask: { type: 'single', label: 'Standing at the kettle, whose reply is already in your **mouth**?' },
    scenario:
      "Devon, two desks over, is not someone you would choose to talk to. He corners you by the kettle " +
      "most mornings with the kind of monologue that has no exits. Today he holds his phone out before " +
      "you have finished stirring: a watercolour he painted over the weekend, his first, he says, since " +
      "a class years ago. It is, by any standard you can name, not good. The proportions are off, the " +
      "colours have gone to mud. He is beaming. “I'm really proud of this one. What do you honestly think?”\n\n" +
      "Four people share that office. He shows each of them the painting.",
    cast: [
      { who: 'Rosa, on the front desk', headline: "“It's genuinely lovely. You should do more.”",
        axes: { arrive: -0.7, decide: -0.4, counts: -0.2 },
        passage:
          "Rosa has worked reception fifteen years, and her real job is reading, at a glance, which of the " +
          "two hundred people who pass her in a day needs reassuring, redirecting, or simply being seen. She " +
          "hears Devon's “honestly” as the same token as the “how are you” she fields a hundred times " +
          "before lunch: a bid for contact, not a request for content (phatic communion, in Malinowski's " +
          "phrase). She is not soft on the truth. She gave her niece a brutal line-by-line read of a portfolio " +
          "last spring, because an art-school panel was about to do worse, and there the stakes made candour " +
          "legible as care. Here the stakes are a lonely man at a kettle, so she answers the question under the " +
          "question, are we alright, and the answer is yes." },
      { who: 'Greg, who used to teach', headline: "“The colours muddied up, but it's a brave first go. The next will be better.”",
        axes: { arrive: +0.4, decide: -0.3 },
        passage:
          "Greg taught secondary-school art for twenty-two years and is still needled by one boy in 2003 he " +
          "told flatly that a piece “didn't work”, who never touched charcoal again. The students who came " +
          "back were the ones he handed a single fixable fault (“your horizon sits too high; drop it and the " +
          "whole picture breathes”). So his line is not a fudge but a calibrated instrument: the true " +
          "information survives intact (the colours failed) wrapped in a next step that keeps the person moving. " +
          "His old trade has a word for it, feed-forward rather than feedback, and the half-remembered staff " +
          "training behind it is real (Dweck on praising the process, not the person)." },
      { who: 'Nadia, in accounts', headline: "“The proportions are off and the colours have gone muddy.”",
        axes: { arrive: +0.5, reach: -0.3, counts: -0.2 },
        passage:
          "Nadia reconciles the company's books, work in which “honest” has exactly one meaning and it is " +
          "not “encouraging”. The deeper root is older: at a leaving-do years ago everyone told her a cake " +
          "was lovely, she learned afterward it was dry and they had all known, and the gap between their faces " +
          "and the truth stung worse than any cake. So she pays Devon the courtesy she wishes she had been paid, " +
          "assuming he wants what she would want (the typical-mind fallacy, the quiet bug behind a great deal of " +
          "social friction). She answered the literal question and skated past its real force (Austin's locutionary " +
          "content, not the illocutionary point); the room will grade her on the result, a deflated man, and on " +
          "politeness as the saving of face (Brown and Levinson), not on her sincere good will. She is not cruel. " +
          "She is precise, in a room that has just priced precision as cruelty." },
      { who: 'Marek, passing through', headline: "“Art's subjective, isn't it. No such thing as good or bad.”",
        axes: { source: +0.5, arrive: -0.2, reach: +0.4 },
        passage:
          "Marek is the office's reflexive de-escalator, and has been since a project blew up under him years " +
          "ago and he concluded that holding no stated position is the safest position. He will nonetheless " +
          "defend one obscure film for forty minutes against all comers, so the relativism is not a conviction " +
          "he holds; it is a door he opens when an evaluative question corners him. That is the tell: his anti " +
          "realism is local, selective, and load-bearing only when he needs the exit. There is a difference " +
          "between holding a view and making a move, and this is a move." }
    ]
  },

  /* 2 ----------------------------------------------------------------- */
  { id: 2, kind: 'probe', topic: 'What kind of true?',
    ask: { type: 'single', label: 'Which reading is **yours**?' },
    scenario:
      "Take a sentence almost everyone agrees with: “Torturing a child purely for your own amusement is " +
      "wrong.” Few would argue. But what kind of true is it? Compare three other true sentences:\n\n" +
      "• “A bachelor is an unmarried man.” True because of what the words mean.\n" +
      "• “Water boils at 100°C at sea level.” True because of how the world is; we checked.\n" +
      "• “Blackcurrant is the best jam.” Not really true or false; a strong preference dressed as a fact.\n\n" +
      "Which one is the child-torture sentence most like?",
    cast: [
      { who: 'Like the bachelor sentence', headline: 'True by definition.',
        axes: { source: +0.6, arrive: +0.3 },
        passage:
          "Here “wrong” just means something close to “the kind of cruelty we condemn”, so the sentence " +
          "is near enough a tautology; you have unpacked the word, not found a fact in the world. Tidy, and it " +
          "explains the feeling of undeniability. The classic blade against it: if “wrong” simply meant " +
          "“what we condemn”, then “but is what we condemn actually wrong?” would be a closed, silly " +
          "question, and it plainly is not (Moore's open-question argument)." },
      { who: 'Like the boiling point', headline: 'A fact we discovered.',
        axes: { source: -0.9, arrive: +0.4 },
        passage:
          "Moral realism. There is a fact of the matter about cruelty the way there is one about water, and we " +
          "have correctly detected it; a dissenting culture would be in error, not merely different. This fits " +
          "the strong intuition that some acts stay wrong even if everyone in the room approves. The bill is " +
          "metaphysical and epistemic: say where such facts reside, and by what faculty we read them, given they " +
          "show up on no instrument (Mackie's argument from queerness is the standing objection)." },
      { who: 'Like the jam', headline: 'A very strong feeling, not a fact.',
        axes: { source: +0.9, arrive: -0.3 },
        passage:
          "Moral anti-realism, an umbrella over several theories (emotivism in Ayer and Stevenson; the error " +
          "theory in Mackie; quasi-realism in Blackburn). The sentence reports an attitude, ours, near universal, " +
          "ferocious, rather than a property of the world. Note it is a claim about the status of the judgment, " +
          "not its strength: a holder can be the most implacable opponent of torture in the building. It is " +
          "routinely misread as indifference, which it is not. What it surrenders is the standing to tell a " +
          "sincere dissenter they got a fact wrong." },
      { who: 'None of these', headline: 'It is its own kind of thing.',
        axes: { source: -0.5, decide: +0.4 },
        passage:
          "The intuition that moral truth is sui generis, not definitional, not empirical, not mere taste, but a " +
          "fourth category with its own rules (the non-naturalism of Moore, and later Parfit and Scanlon). " +
          "Respectable company. It also concedes that the other three boxes do not fit, which is roughly where " +
          "serious meta-ethics begins." }
    ]
  },

  /* 3 ----------------------------------------------------------------- */
  { id: 3, kind: 'probe', topic: 'The visitor',
    ask: { type: 'multi', label: "Which of these could you **argue** yourself, even one you don't believe? (mark any)" },
    scenario:
      "You are a guest in a country where it is a serious insult to hand someone food with your left hand, the " +
      "left being reserved, traditionally, for unclean tasks. You are left-handed. At dinner you pass the bread " +
      "to your host with your left hand, out of pure habit. A small silence. He is visibly offended; the table " +
      "has noticed. Nothing was harmed, nothing broken, and yet here you have plainly done something that, here, " +
      "counts as wrong.\n\n" +
      "Four other guests talk it over afterwards. Setting aside what is polite in the moment, who, if anyone, " +
      "has the correct view of whether the left-hand bread was actually wrong?",
    cast: [
      { who: 'The host', headline: "“Here, it was wrong. That is all 'wrong' can mean.”",
        axes: { reach: +0.8, source: +0.4, counts: +0.5 },
        passage:
          "He did not reason his way here; he absorbed it at his grandmother's table, where the left hand was " +
          "the latrine hand in a house that predated indoor plumbing and the rule tracked something real. The " +
          "function is gone; the feeling is not. The norm has been internalised as a value rather than a tip, " +
          "which is why a clean hand can still trigger a genuine flush of insult (the moralisation of a once " +
          "practical rule; Chesterton's fence is the warning against tearing it down before you know what it " +
          "did). The “relativism” is the philosopher's label; from inside it is just the weight of every " +
          "ancestor who kept it." },
      { who: 'Lena, an aid worker', headline: "“Nothing was harmed, so nothing was actually wrong. He is mistaken to be offended.”",
        axes: { counts: -0.9, reach: -0.6 },
        passage:
          "Lena has spent fifteen years in places where “you must respect our customs” was, more than once, " +
          "the exact sentence that preceded a girl being kept out of school, so her harm razor is not armchair " +
          "theory but scar tissue: a hard-won refusal to grant any custom automatic authority (Mill's harm " +
          "principle, sharpened by experience). Swung evenly, the same blade also cuts the things she privately " +
          "holds sacred, the desecrated grave, the betrayed confidence, all of which come out as “no victim, " +
          "no wrong”, which is exactly the pressure the harmless-wrongs cases put on her." },
      { who: 'Idris, who travels constantly', headline: "“Both are right, each inside their own world, and there is no fact above them.”",
        axes: { source: +0.8, reach: +0.9 },
        passage:
          "Idris is a conference interpreter and a third-culture kid who has lived fully inside six normative " +
          "worlds and watched each feel like bedrock from within and arbitrary from without, until a view from " +
          "nowhere stopped being available to him as an experience. His claim is not “I'm unsure who's right” " +
          "but “the question 'who is really right' has nothing to answer to” (metaethical relativism; Bernard " +
          "Williams' relativism of distance, where the confrontation is merely notional). The most deflationary " +
          "seat at the table, and the one that most quiets the hum of “somebody here must be objectively wrong”." },
      { who: 'Priya, a law student', headline: "“Nobody has it yet. There is a right answer, we just have to reason it out.”",
        axes: { source: -0.7, reach: -0.8, arrive: +0.6 },
        passage:
          "Two years into law, drilled daily in a system whose whole conceit is that disputes settle by reasons " +
          "that generalise rather than by counting heads, Priya reaches by reflex for “what does the rule " +
          "actually protect: hygiene, dignity, trust?” (the contractualist instinct, morality as principles no " +
          "one could reasonably reject; Scanlon). The most demanding chair, since it owes everyone a method and a " +
          "verdict, and the only one that refuses to let “that's just our way” close the matter. Also, lovingly, " +
          "why she is constitutionally unable to leave a dinner-table disagreement unadjudicated." }
    ],
    realNote:
      "A near neighbour, for later: a whole society can hold a belief no outside evidence would move, which to " +
      "outsiders looks like a delusion, yet it fails the clinical definition, which specifically exempts beliefs " +
      "“ordinarily accepted by one's culture”. So is the line between conviction and delusion partly a headcount?"
  },

  /* 4 ----------------------------------------------------------------- */
  { id: 4, kind: 'vignette', topic: 'The grave',
    ask: { type: 'single', label: 'Whose response do you **recognise** in yourself?' },
    scenario:
      "Before she died, your aunt asked one thing: that you visit her grave on the first Sunday of each month, " +
      "just to sit a while. You promised. You meant it. For two years you went. Lately you have thought it " +
      "through honestly. She is dead and knows nothing of whether you come. No one else knows about the promise, " +
      "so no one is let down. The drive is two hours. Four people you know, given the same facts, land in four " +
      "different places.",
    cast: [
      { who: 'Tomás stops, and feels fine about it', headline: "“The visit reached no one.”",
        axes: { decide: -0.8, counts: -0.7, arrive: +0.4 },
        passage:
          "Tomás watched his own father keep a weekly grave appointment for eleven years and watched it harden " +
          "from love into a cage: a duty that ate Sundays and manufactured guilt on the rare weeks he missed, " +
          "crowding out the living. So his clean stop is not coldness; it is a considered refusal of a thing he " +
          "has seen metastasise. He is a thoroughgoing instrumentalist about ritual: an act is worth its effect, " +
          "the effect here is nil, so the obligation is nil. What he cannot quite see, and what arguably cost his " +
          "father too, is the expressive work the act does, and the sharper point that a person who keeps promises " +
          "only when they pay is running a detectably different program from one who keeps them full stop (the " +
          "costly signal behind being trusted; Robert Frank)." },
      { who: 'Maeve keeps going, and cannot tell you why', headline: "“I just do. It would feel wrong not to.”",
        axes: { arrive: -0.9, counts: +0.7 },
        passage:
          "Maeve is a research chemist who will tell you plainly she does not believe her aunt is “there” or " +
          "aware of anything, and who drives the two hours regardless; the gap between her stated beliefs and her " +
          "behaviour is the whole phenomenon. Ask her to justify it and she stalls; press her and she gets annoyed " +
          "rather than persuaded, which is the diagnostic signature (moral dumbfounding; Haidt). Once “a deathbed " +
          "promise” is filed as a protected value, setting it beside a two-hour drive is not a hard sum but a " +
          "category error, and the mind flags the very act of weighing as a small betrayal (the taboo tradeoff; " +
          "Tetlock). Part of why she goes is so she never has to be the kind of person who ran that calculation." },
      { who: 'Cathal is appalled the question is even asked', headline: "“You promised. She is gone. That is exactly why it holds.”",
        axes: { decide: +0.8, counts: +0.8, source: -0.4 },
        passage:
          "Cathal has buried a wife and two brothers, and the visits are the last live wire to people he still " +
          "argues with in his head on the drive home; to him the bond is neither metaphor nor memory but ongoing, " +
          "and cutting the ritual would cut it (continuing bonds, the grief researchers' term for keeping the dead " +
          "in the present tense). The promise binds harder because death made it unrepayable, and honouring what " +
          "can never be repaid is close to his whole definition of respect. He would not say a word of this. He " +
          "would say: you don't stop going." },
      { who: 'Wren says the only error was upstream', headline: "“Never promise something that specific in the first place.”",
        axes: { decide: -0.4, arrive: +0.5 },
        passage:
          "Wren is the one who reads the prenup, declines to be anyone's sole emergency contact, and once lost " +
          "three years to an open-ended caregiving role no one would let them set down, so “never sign a sacred, " +
          "open-ended commitment whose future cost you can't see” is autobiography, not aphorism. It is genuinely " +
          "shrewd commitment-device reasoning, managing tomorrow's obligations instead of tomorrow's guilt (the " +
          "Ulysses contract, tying yourself to the mast in advance). It also steps around the actual question, " +
          "which is the tell: handed a bind, Wren will always reach to redesign the bind rather than sit inside it." }
    ]
  },

  /* 5 ----------------------------------------------------------------- */
  { id: 5, kind: 'vignette', topic: 'The footbridge',
    ask: { type: 'single', label: 'Whose reasoning would you **own** afterwards?' },
    scenario:
      "A runaway trolley is about to kill five people on the track ahead. You are on a footbridge above " +
      "the line, beside a large stranger. The only way to stop the trolley in time is to push him off the " +
      "bridge into its path: his body would halt it. He dies; the five live. There is no version where you " +
      "jump yourself and it works; it has to be him, and it has to be a push.\n\n" +
      "Four people are talked through the exact same dilemma.",
    cast: [
      { who: 'Dr. Okafor, a trauma surgeon', headline: "“Five lives over one. I push, and I would not pretend otherwise.”",
        axes: { decide: -0.9, arrive: +0.4 },
        passage:
          "Okafor triages by number on a normal Tuesday and has trained herself out of letting the vividness " +
          "of one face outvote five she cannot see. To her the maths is the morality, and flinching from the " +
          "push while accepting the five deaths is sentiment dressed as principle. She has noticed that almost " +
          "everyone who would pull a lever balks at the shove even though the body count is identical, and she " +
          "regards that gap as a bug in human wiring, not a moral insight." },
      { who: 'Sam, who was once used by someone', headline: "“You do not get to make a man into a brake. I cannot push.”",
        axes: { decide: +0.8, counts: +0.4, source: -0.25 },
        passage:
          "Sam draws a hard line between a death you cause as a side effect and a death where you use a person's " +
          "body as your instrument, and the line is not abstract to him; he has been on the receiving end of being " +
          "treated as a means and never forgot the difference. This is close to the doctrine of double effect, and " +
          "to Kant's refusal to use a person merely as a tool. He cannot tell you the five matter less. He can tell " +
          "you that becoming the kind of person who shoves a stranger to his death is a price he will not pay." },
      { who: 'Bea, who would flip a switch but not push', headline: "“I would divert a trolley. I could not push him. No, I cannot justify the gap.”",
        axes: { arrive: -0.7, counts: +0.5 },
        passage:
          "Bea is honest about something most people paper over: she would pull a lever to send the trolley onto " +
          "one person, yet she could not lay hands on the man, and she knows the arithmetic is the same. The push " +
          "feels categorically different (the up-close, personal-force version lights up a different system; this " +
          "is the heart of Greene's dual-process work on the trolley cases). She is not claiming the feeling is a " +
          "proof. She is declining to overrule it just because she cannot put it into an equation." },
      { who: 'Theo, who refuses the setup', headline: "“No real footbridge works like this. The certainty is the trick.”",
        axes: { arrive: +0.4, source: +0.3 },
        passage:
          "Theo's objection is to the thought experiment itself: real life never hands you a guaranteed one-for-five " +
          "trade with a body that conveniently stops a trolley, and smuggling in that false certainty is how the " +
          "puzzle launders a conclusion you would never accept under real uncertainty. There is something to this " +
          "(the cases are engineered to isolate one intuition), though it can also be a way to dodge every hard " +
          "question by disputing its frame. He would rather argue about the lie in the premise than answer it." }
    ],
    realNote:
      "This is a real and sturdy finding, not a guess: across many studies most people will divert the trolley " +
      "onto one to save five, yet refuse to push the man, though the trade is identical. The interesting question " +
      "is not who is right but why the hand on the body changes everything."
  },

  /* 6 ----------------------------------------------------------------- */
  { id: 6, kind: 'vignette', topic: 'Behind closed doors',
    ask: { type: 'single', label: 'Whose gut matches **yours**?' },
    scenario:
      "Alone in his flat, with the blinds down and no one to ever know, a man takes the flag of his own country, " +
      "uses it to scrub the toilet until it is filthy, then bins it. He feels nothing in particular about it. No " +
      "one sees. No one is upset, because no one finds out. Nothing else in the world is different the next morning.\n\n" +
      "Was what he did wrong? Four people react.",
    cast: [
      { who: 'Priya, an emergency nurse', headline: "“No victim, no crime. It is a piece of cloth.”",
        axes: { counts: -0.9, reach: -0.3 },
        passage:
          "Priya spends her working life around actual harm and has little patience for wrongs with no one on the " +
          "other end of them. Trace the act forward and it touches no one, so for her there is simply nothing there " +
          "to condemn; the discomfort other people feel is about symbolism, and symbolism is not a victim. She would " +
          "say the same about a man who quietly insults a photograph or curses at the moon: distasteful, maybe, but " +
          "not the kind of thing the word wrong is for." },
      { who: 'Daniel, who surprises himself', headline: "“It is wrong. No, I cannot tell you who it hurt.”",
        axes: { arrive: -0.8, counts: +0.7, source: -0.3 },
        passage:
          "Daniel would call himself a rationalist and is annoyed to find a verdict arriving with no argument under " +
          "it: it is wrong, and pressed for the victim he comes up empty and stays certain anyway. This is moral " +
          "dumbfounding in its purest form (Haidt built a whole research line on exactly this stuck feeling). What " +
          "has fired is the sense that some things are desecrated rather than damaged, that purity and respect are " +
          "real moral registers and not just harm in disguise. He cannot cash it out. He also cannot make it go away." },
      { who: 'Mara, who watches the man, not the cloth', headline: "“The flag is nothing. What it says about him is the point.”",
        axes: { decide: +0.4, counts: +0.6, arrive: -0.2 },
        passage:
          "Mara relocates the whole question from the act to the actor: the cloth does not matter, but a person who " +
          "would do that to a thing others hold sacred, even unseen, is cultivating something corrosive in himself, " +
          "and character is built in private. This is the virtue-ethics move (the question is not what was harmed but " +
          "what kind of person this makes you). It lets her call the act bad without needing a victim, by pointing at " +
          "the man he is quietly becoming." },
      { who: 'Wesley, who reaches for a different word', headline: "“Not wrong. Distasteful. Those are not the same drawer.”",
        axes: { source: +0.5, counts: -0.4, reach: +0.3 },
        passage:
          "Wesley thinks the trouble is a jammed filing system: we cram disgust, rudeness, taboo and genuine moral " +
          "wrong into the one word and then argue past each other. He files this under distasteful or taboo, a breach " +
          "of a norm about the sacred, and pointedly not under immoral, which he reserves for things that wrong " +
          "someone. Drawing that line is a real skill, and it is also how a person talks themselves out of taking any " +
          "taboo seriously, one reclassification at a time." }
    ]
  },

  /* 7 ----------------------------------------------------------------- */
  { id: 7, kind: 'vignette', topic: 'The alibi',
    ask: { type: 'single', label: 'Whose answer would you **give** the partner?' },
    scenario:
      "Your oldest friend calls in a quiet panic. Last night they were not where their partner thinks they were, " +
      "and the partner is about to ring you to check. It is not an affair; it is a secret second job, taken because " +
      "the household is quietly drowning in debt the partner does not know about. Your friend begs you to confirm " +
      "the cover story: that the two of you were together. The phone is about to ring.",
    cast: [
      { who: 'Joan, who keeps her people', headline: "“I cover. You do not hand a friend to the wolves over a phone call.”",
        axes: { counts: +0.7, reach: +0.3, decide: -0.2 },
        passage:
          "Joan's first loyalty is to the person, not to an abstract rule about truth-telling, and she has built her " +
          "whole life on being the one who can be relied on when it counts. To her, loyalty is a sacred bond and a " +
          "friend's trust outranks a stranger-ish partner's right to a fact, especially over something this " +
          "sympathetic. She knows she is lying. She would tell you a friend who will not lie for you was never quite " +
          "a friend, and mean it." },
      { who: 'Ade, who will not be the liar', headline: "“I will not say the words. I love you, and I will not say them.”",
        axes: { counts: -0.5, decide: +0.6 },
        passage:
          "Ade separates standing by his friend from speaking a lie directly into another person's ear, and the " +
          "second is a line he holds even when the cause is sympathetic. It is not coldness; it is that he refuses to " +
          "make the partner trust a falsehood he authored, which uses her as a tool in a story she did not agree to. " +
          "He will help in every other way. He will not be the mouth the lie comes out of, because some bright lines " +
          "are about what you will personally do, not what outcome you want." },
      { who: 'Lin, who lies and hates it', headline: "“Fine. I cover this once. Then you tell them, because I am not doing this twice.”",
        axes: { arrive: +0.3, counts: +0.2 },
        passage:
          "Lin makes the grubby call and does not dress it up: the immediate blowup helps no one tonight, so she buys " +
          "her friend a day, on condition the truth comes out soon. She is running pure damage control (the workable " +
          "slightly dirty option over the clean disaster), and she knows the risk, that one cover becomes a habit and " +
          "she becomes load-bearing in someone else's lie. She takes it anyway, with a deadline attached, because she " +
          "trusts a managed mess over a principled explosion." },
      { who: 'Tom, who answers to the marriage', headline: "“I tell them to come clean. I am not going to help fool someone who trusts us both.”",
        axes: { decide: +0.5, counts: -0.3, reach: -0.3 },
        passage:
          "Tom widens the frame past the friendship to the person about to be deceived, who is also someone he knows " +
          "and who is being managed rather than respected. He will not be recruited into that, and he suspects the " +
          "kindest thing for the friendship long-term is to refuse the cover and push for honesty now, before the debt " +
          "and the lie both compound. It is the least cozy answer in the room, and possibly the one the friend will " +
          "thank him for in a year, or never forgive." }
    ]
  },

  /* 8 ----------------------------------------------------------------- */
  { id: 8, kind: 'probe', topic: 'The pond and the cheque',
    ask: { type: 'single', label: 'Whose reasoning do you **trust**?' },
    scenario:
      "You are walking past a shallow pond and see a small child face-down in it, drowning. No one else is near. " +
      "You would ruin an expensive pair of shoes wading in, but of course you save the child; anyone would, and " +
      "anyone who walked on to save their shoes would be a monster.\n\n" +
      "Now: a child on the other side of the world will die this month of something cheap to prevent, and the cost " +
      "of preventing it is about the price of those shoes. You know this. The cheque sits unwritten. What, exactly, " +
      "is the moral difference between the two children?",
    cast: [
      { who: 'Sané, who writes the cheque', headline: "“There is no real difference. Distance is not a moral fact. So I give.”",
        axes: { decide: -0.8, reach: -0.7, counts: -0.6 },
        passage:
          "Sané bites the bullet that most people dodge: if proximity and visibility do not actually change what a " +
          "life is worth, then the unwritten cheque is the walk-past-the-pond, just slower and less vivid. This is " +
          "Singer's argument run to its conclusion, and she lives closer to it than most, giving steadily and " +
          "uncomfortably. The cost is that the logic does not obviously stop until it has taken nearly everything, " +
          "which is either its honesty or its reductio, depending on who you ask." },
      { who: 'Bram, who trusts the closeness', headline: "“The child in front of me is mine to save. The distant one is a tragedy, not my failure.”",
        axes: { decide: +0.5, reach: +0.6, counts: +0.2 },
        passage:
          "Bram thinks the difference is real and not a mere bias: standing in front of the drowning child makes you " +
          "the one person who can act, while diffuse distant need is everyone's and therefore assignable to no one in " +
          "particular. He leans on special obligations and agency, the idea that morality is partly about the ties and " +
          "positions you actually occupy, not a god's-eye sum. The worry he has to carry is that this is exactly what a " +
          "comfortable person would want to be true." },
      { who: 'Hester, who says it asks too much', headline: "“A morality you cannot actually live is not binding. I give some, not everything.”",
        axes: { arrive: +0.3, decide: -0.1 },
        passage:
          "Hester accepts the logic has force and still refuses to be ruled by it, on the ground that an ethics " +
          "demanding you strip yourself to the bone for strangers has overshot what morality can reasonably require " +
          "(the demandingness objection). She draws a sustainable line and gives within it. Critics say she has just " +
          "rationalised her shoes; she says a duty no human can carry is not a duty but a recipe for guilt, and guilt " +
          "helps no child." },
      { who: 'Quinn, who acts on the bias knowingly', headline: "“The pull toward the child in front of me is just wiring, not a real reason. I know that. I still let it win a little.”",
        axes: { arrive: -0.5, source: +0.4 },
        passage:
          "Quinn agrees with Sané that nearness changes nothing about what a life is worth: the tug he feels toward the " +
          "child at his feet is a fact about human psychology, not a moral reason. Where he splits from her is that he " +
          "will not fully override it. He treats his own partiality as something to manage rather than a principle to " +
          "defend or a sin to scrub out: he gives what he can keep giving, year after year, and admits the rest is " +
          "plain bias that he is choosing to let stand. It is the least heroic seat at the table and perhaps the most " +
          "honest, owning the gap rather than closing it or pretending it is not there." }
    ]
  },

  /* 9 ----------------------------------------------------------------- */
  { id: 9, kind: 'probe', topic: 'Two drivers',
    ask: { type: 'single', label: 'Which verdict is **yours**?' },
    scenario:
      "Two drivers have exactly the same amount to drink and drive home equally carelessly down the same kind of " +
      "street. The first gets home without incident and sleeps it off. The second rounds a corner where, this once, " +
      "a child has run into the road, and kills them. Same choices, same recklessness; one is a guilty secret, the " +
      "other a manslaughter. How much worse, morally, is the second driver than the first?",
    cast: [
      { who: 'Equally guilty', headline: 'The outcome was luck. They made the same choice; they bear the same blame.',
        axes: { arrive: +0.6, decide: +0.3, source: -0.3 },
        passage:
          "On this view blame should track what was in a person's control, and the swerving child was in neither " +
          "driver's (the control principle: you are not more culpable for what luck added). Both chose to drive drunk; " +
          "the rest is the universe. It is clean and consistent, and it collides hard with the fact that we do, " +
          "everywhere, punish the one who killed far more harshly, which this view has to call a mistake we keep making." },
      { who: 'The one who killed did worse', headline: 'Outcomes are part of the act. Killing a child is not the same deed as getting home.',
        axes: { decide: -0.5, arrive: -0.3, counts: +0.3 },
        passage:
          "This sides with the gut and against the tidy principle: the second driver did not merely risk a death, he " +
          "caused one, and a morality that calls those the same has lost contact with what actually happened (this is " +
          "the reality of moral luck, pressed by Nagel and Williams). The price of the view is that it makes part of " +
          "your moral standing hostage to things you did not control, which is either deeply true to life or deeply " +
          "unfair, and maybe both." },
      { who: 'Our blame tracks outcomes for good reasons', headline: 'Deep desert may be equal, but our practice of blaming the killer harder earns its keep.',
        axes: { source: +0.4, decide: -0.2 },
        passage:
          "The pragmatic seat: maybe at some metaphysical level the two are equally culpable, but a community that " +
          "lets outcomes drive blame and punishment is one that takes harm seriously and deters it, so the practice is " +
          "justified by what it does even if cosmic bookkeeping would split the difference. It cares less about who " +
          "truly deserves what and more about what blaming-practices build. Critics call that letting the useful " +
          "overrule the true." },
      { who: 'There is no fact about deep desert here', headline: 'Strip away the practices and there is no further truth about how much each really deserves.',
        axes: { source: +0.7 },
        passage:
          "This one denies the question has a hidden correct answer at all: once you have described the choices, the " +
          "outcome, and our reactions, there is no extra moral fact sitting underneath about true desert waiting to be " +
          "found (a skeptical, anti-realist read of blame). It is not that the answer is hard; it is that the deep " +
          "version of the question is empty, and the only real questions left are practical ones about what to do." }
    ]
  },

  /* 10 ---------------------------------------------------------------- */
  { id: 10, kind: 'probe', topic: 'The queue',
    ask: { type: 'single', label: 'Where do you **file** it?' },
    scenario:
      "A long, tired queue. A man walks calmly to the front and joins it there, not out of any emergency, but " +
      "because he simply does not feel like waiting. No one is physically hurt; everyone behind him now waits a " +
      "little longer, and the air fills with that particular silent fury. He is breaking something. The question " +
      "is what.",
    cast: [
      { who: 'It is genuinely immoral', headline: 'He is free-riding on a fairness everyone else is paying into.',
        axes: { counts: -0.6, decide: -0.3, reach: -0.4 },
        passage:
          "The queue is a small machine for distributing a scarce thing, time, fairly, and it runs on everyone " +
          "accepting the cost. The jumper takes the benefit of the system while refusing its burden, which is the " +
          "structure of a real (if minor) wrong: free-riding, the same shape as fare-dodging or tax-cheating. On " +
          "this view the smallness is about scale, not category; it is the same wrong as the big ones, in miniature." },
      { who: 'It is rude, not immoral', headline: 'He broke a convention, not a moral law. Different drawers.',
        axes: { source: +0.5, reach: +0.4, counts: -0.2 },
        passage:
          "Rudeness and immorality are different registers, and jamming them together is how people end up morally " +
          "exhausted by everything. Queues are a local custom (they barely exist in some places), so flouting one is a " +
          "breach of etiquette, a failure of the social lubricant, not a violation of a duty you owe a person. Keeping " +
          "that line clear is a real skill, and noticing where you draw it tells you which of your rules are morality " +
          "and which are manners you have mistaken for it." },
      { who: 'The line between rude and wrong is just intensity', headline: 'Same stuff all the way down. Manners are small morals; morals are big manners.',
        axes: { source: +0.7 },
        passage:
          "This deflates the whole distinction: rudeness and immorality are not two kinds of thing but two ends of one " +
          "dial, both just norms we enforce with disapproval, differing in how much we care. On this reading asking " +
          "whether queue-jumping is really immoral or only rude is like asking whether a hill is really a mountain; " +
          "there is no hidden joint in nature to carve, only a continuum and our labels for stretches of it." },
      { who: 'The wrong is the contempt it shows', headline: 'It is not the lost minutes. It is the open display that the rest of us do not count.',
        axes: { counts: +0.6, decide: +0.3 },
        passage:
          "Here the harm is not the trivial delay but the disrespect: he has announced, to forty people, that their " +
          "time and their patience do not register to him, and contempt is a genuine moral injury even when it costs " +
          "no measurable thing. This treats dignity and standing as things you can wrong directly. It also explains the " +
          "heat in the queue, which is plainly out of all proportion to ninety lost seconds and entirely in proportion " +
          "to being treated as furniture." }
    ]
  },

  /* 11 ---------------------------------------------------------------- */
  { id: 11, kind: 'probe', topic: 'The shared certainty',
    ask: { type: 'single', label: 'Which take is **yours**?' },
    scenario:
      "An entire society holds, with total conviction, a belief no evidence could ever shift: that the dead " +
      "ancestors are present, watching, and judging each choice. Everyone is raised in it; no argument or absence " +
      "of proof disturbs it. To an outsider it looks like a fixed belief held against all evidence, which is more " +
      "or less the dictionary definition of a delusion, except that the clinical definition pointedly exempts " +
      "beliefs ordinarily shared by one's culture. So what is the actual difference between a delusion and a " +
      "deeply held cultural conviction? Is it just how many people share it?",
    cast: [
      { who: 'Basically, yes, it is a headcount', headline: 'Call it faith when shared, delusion when lonely. The belief is the same.',
        axes: { reach: +0.7, source: +0.6 },
        passage:
          "On this view the only honest difference is social: a fixed, evidence-proof belief is a delusion when one " +
          "person holds it and a tradition when a million do, and the clinical exemption just encodes that we do not " +
          "pathologise the powerful or the populous. It is deflationary and a little vertiginous, because it implies " +
          "your own deepest certainties are graded sane chiefly by the company they keep." },
      { who: 'No, it is about how the belief is held', headline: 'Delusion is a relationship to evidence, not a vote count. Crowds can be mass-deluded.',
        axes: { source: -0.6, reach: -0.5, arrive: +0.4 },
        passage:
          "This insists there is a real property in play, how a belief responds to counter-evidence, reasons, and " +
          "doubt, that has nothing to do with the headcount; a belief sealed against all of that is epistemically " +
          "broken whether one person or a nation holds it, and shared delusions are a real category. It keeps a " +
          "standard of rationality that does not bend to majorities. Its burden is to say why the believers' own " +
          "internal coherence does not count as a relationship to evidence too." },
      { who: 'The exemption is doing real work', headline: 'A belief that lets you function and is shared is not a pathology, even if false.',
        axes: { reach: +0.4 },
        passage:
          "The functional reading: medicine calls something a delusion partly when it wrecks a life, and a belief that " +
          "is woven through a working culture, orienting people who cope and connect and raise children, is not doing " +
          "the damage the word is meant to flag, true or not. It cares less about correspondence to fact and more about " +
          "whether the belief lets a life run. The risk is that it lets any sufficiently cozy falsehood off the hook." },
      { who: 'There is no fact about which frames are delusions', headline: 'Pick the evidence-standard and you pick the answer. There is no neutral one.',
        axes: { source: +0.7 },
        passage:
          "This denies there is a frame-independent fact of the matter: deciding whether the ancestors-belief is " +
          "delusion or knowledge requires a standard of what counts as evidence, and every such standard is itself " +
          "inside some tradition, so there is no view from nowhere to settle it. Not unsure, but holding that the " +
          "question has no answer above the frames. The cleanest and coldest seat, and the one that makes the word " +
          "delusion stop meaning much at all." }
    ]
  },

  /* 12 ---------------------------------------------------------------- */
  { id: 12, kind: 'probe', topic: 'The cold judge',
    ask: { type: 'single', label: 'Which reading is **closest**?' },
    scenario:
      "A man tells you, calmly and sincerely, that the way he treated someone last year was morally wrong. He is " +
      "not being ironic and not fishing for comfort; he agrees with the judgment completely. He also feels not the " +
      "faintest pull to have acted differently, no guilt, no urge to apologise, nothing. He would, he says, do it " +
      "again, and still call it wrong. What is going on with him?",
    cast: [
      { who: 'He cannot really mean it', headline: 'Really judging an act wrong includes feeling at least some pull against it. He has the words but not the pull, so it is not a real judgment.',
        axes: { arrive: -0.6, decide: +0.2 },
        passage:
          "This holds that the verdict and the pull come as a package: to genuinely judge an act wrong is, in part, to " +
          "be at least faintly moved against it, so a man with no pull at all has not made a moral judgment, he has only " +
          "said the word (judgment internalism). On this view a true amoralist is close to impossible: he is either " +
          "feeling more than he admits, or using wrong the way a tourist uses a phrase he cannot actually speak. The " +
          "strain on the view is that by every other sign he understands exactly what he is saying." },
      { who: 'He means it; motivation is just separate', headline: 'Seeing that an act is wrong and being moved to avoid it are two different things. He has the first and lacks the second.',
        axes: { arrive: +0.6, source: +0.2 },
        passage:
          "The opposing view: you can fully grasp and sincerely assert that something is wrong and simply not care, " +
          "because recognising a wrong and being moved by it are separate capacities that usually travel together but " +
          "need not (externalism about moral motivation). The amoralist is rare but real, and not confused. It keeps " +
          "moral judgment as a clear-eyed reading of the facts, at the price of making that reading strangely inert, a " +
          "verdict that need move no one, not even the person who reaches it." },
      { who: 'For him, wrong just names what others condemn', headline: 'He reports the social fact and declines to own it.',
        axes: { source: +0.7, reach: +0.4 },
        passage:
          "Maybe when he says wrong he means something like the thing my society condemns, a fact he can state " +
          "accurately and flatly, the way you might note that a move is illegal in chess without feeling bound by " +
          "chess. He is reporting the norm from the outside, not endorsing it from the inside (a relativist or " +
          "anti-realist gloss on what his words even pick out). It dissolves the puzzle by changing what wrong means " +
          "in his mouth, which is either an insight or a trick, depending on whether you think he gets to do that." },
      { who: 'This is just what akrasia looks like from inside', headline: 'Most of us say it and act against it daily. He is only unusually honest about the gap.',
        axes: { arrive: +0.3, counts: -0.2 },
        passage:
          "The deflationary, humane reading: the gap between I know this is wrong and doing it anyway is the most " +
          "ordinary thing in the world (weakness of will, akrasia, the subject of ethics since Aristotle), and what " +
          "unsettles us about this man is not that he has the gap but that he has stopped performing the guilt that " +
          "usually papers over it. He has dropped the apology we all owe and rarely mean. The discomfort he causes may " +
          "be mostly about the mask, not the face." }
    ]
  },
];
