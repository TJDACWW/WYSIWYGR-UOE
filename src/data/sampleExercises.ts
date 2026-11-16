import { Exercise, ExerciseType } from '../types/exercise';

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export const SAMPLE_EXERCISES: Exercise[] = [
  // 1. Multiple Choice Cloze
  {
    id: 'sample-mc-cloze',
    type: 'multiple-choice-cloze',
    title: 'The Quiet Architecture of Urban Parks',
    subtitle: 'Part 1 · Multiple Choice Cloze',
    instructions: 'Read the text below and decide which answer (A, B, C or D) best fits each gap.',
    updatedAt: '2026-11-15T10:00:00Z',
    optionCount: 4,
    passageHtml: `<p>For generations, municipal planners treated city parks as little more than decorative breathing spaces, tucked neatly between commercial boulevards. Today, however, landscape architects <span data-gap="1" contenteditable="false">[1]</span> these green corridors as essential civic infrastructure capable of cooling dense neighbourhoods by several degrees.</p>
<p>When a major heatwave strikes, tree canopies and permeable soil <span data-gap="2" contenteditable="false">[2]</span> a measurable buffer against radiant street heat. In addition to their ecological benefits, well-designed parks <span data-gap="3" contenteditable="false">[3]</span> a rare democratic venue where residents from every background cross paths without the expectation of spending money.</p>
<p>Creating such spaces, nevertheless, demands careful restraint. Over-programming a park with commercial kiosks and rigid fences can <span data-gap="4" contenteditable="false">[4]</span> the very sense of unhurried freedom that draws visitors in. The most beloved urban gardens <span data-gap="5" contenteditable="false">[5]</span> a delicate balance between deliberate cultivation and open-ended lawn, allowing people to <span data-gap="6" contenteditable="false">[6]</span> their own rhythms of rest and conversation.</p>`,
    items: [
      {
        id: 'mcc-1',
        gapNumber: 1,
        options: ['regard', 'estimate', 'propose', 'insist'],
        correctIndex: 0,
        explanation: '"Regard ... as" is the standard collocation meaning to consider in a specified way.',
      },
      {
        id: 'mcc-2',
        gapNumber: 2,
        options: ['achieve', 'provide', 'deliver', 'submit'],
        correctIndex: 1,
        explanation: '"Provide a buffer against" is the natural collocation.',
      },
      {
        id: 'mcc-3',
        gapNumber: 3,
        options: ['offer', 'grant', 'spare', 'donate'],
        correctIndex: 0,
        explanation: '"Offer a venue" is idiomatic in formal prose.',
      },
      {
        id: 'mcc-4',
        gapNumber: 4,
        options: ['decline', 'undermine', 'withdraw', 'abolish'],
        correctIndex: 1,
        explanation: '"Undermine a sense of freedom" means to gradually weaken it.',
      },
      {
        id: 'mcc-5',
        gapNumber: 5,
        options: ['strike', 'beat', 'clash', 'knock'],
        correctIndex: 0,
        explanation: '"Strike a balance" is a fixed English collocation.',
      },
      {
        id: 'mcc-6',
        gapNumber: 6,
        options: ['invent', 'discover', 'establish', 'appoint'],
        correctIndex: 2,
        explanation: '"Establish their own rhythms" fits naturally with routine and pace.',
      },
    ],
  },

  // 2. Open Cloze
  {
    id: 'sample-open-cloze',
    type: 'open-cloze',
    title: 'Memory and the Paper Notebook',
    subtitle: 'Part 2 · Open Cloze',
    instructions: 'Read the text below and think of the word which best fits each gap. Use only one word in each gap.',
    updatedAt: '2026-11-15T10:05:00Z',
    passageHtml: `<p>Despite the convenience of cloud-synced note apps, many researchers and novelists still swear <span data-gap="1" contenteditable="false">[1]</span> keeping a pocket-sized paper notebook. Writing by hand forces the brain to slow <span data-gap="2" contenteditable="false">[2]</span>, requiring a selective summary rather <span data-gap="3" contenteditable="false">[3]</span> verbatim transcription.</p>
<p>In a landmark series of classroom studies, students <span data-gap="4" contenteditable="false">[4]</span> took longhand notes consistently outperformed laptop users on conceptual questions, even <span data-gap="5" contenteditable="false">[5]</span> their notebooks contained far fewer words overall. Because a pen cannot keep pace with rapid speech, the writer must process ideas in real time <span data-gap="6" contenteditable="false">[6]</span> order to capture what truly matters.</p>`,
    items: [
      { id: 'oc-1', gapNumber: 1, acceptedAnswers: ['by'], explanation: '"Swear by" means to have great confidence in.' },
      { id: 'oc-2', gapNumber: 2, acceptedAnswers: ['down'], explanation: 'Phrasal verb "slow down".' },
      { id: 'oc-3', gapNumber: 3, acceptedAnswers: ['than'], explanation: 'Contrastive conjunction "rather than".' },
      { id: 'oc-4', gapNumber: 4, acceptedAnswers: ['who', 'that'], explanation: 'Relative pronoun referring to students.' },
      { id: 'oc-5', gapNumber: 5, acceptedAnswers: ['though', 'when', 'if'], explanation: 'Concessive linker "even though" (or "even when").' },
      { id: 'oc-6', gapNumber: 6, acceptedAnswers: ['in'], explanation: 'Purpose phrase "in order to".' },
    ],
  },

  // 3. Word Formation
  {
    id: 'sample-word-formation',
    type: 'word-formation',
    title: 'Deep-Sea Bioluminescence',
    subtitle: 'Part 3 · Word Formation',
    instructions: 'Read the text below. Use the word given in capitals next to each gap to form a word that fits in the gap.',
    updatedAt: '2026-11-15T10:10:00Z',
    passageHtml: `<p>Far beneath the sunlit surface of the ocean, where complete <span data-gap="1" data-stem="DARK" contenteditable="false">[1] _____ (<strong>DARK</strong>)</span> prevails, a surprising number of organisms generate their own light. Known as bioluminescence, this chemical reaction is an <span data-gap="2" data-stem="ORDINARY" contenteditable="false">[2] _____ (<strong>ORDINARY</strong>)</span> versatile adaptation.</p>
<p>Some lanternfish flash rhythmic patterns along their flanks for <span data-gap="3" data-stem="RECOGNISE" contenteditable="false">[3] _____ (<strong>RECOGNISE</strong>)</span> among members of the same shoal, whereas deep-water squid release glowing clouds to create a moment of <span data-gap="4" data-stem="CONFUSE" contenteditable="false">[4] _____ (<strong>CONFUSE</strong>)</span> and slip away from predators.</p>
<p>What fascinates marine chemists most is the <span data-gap="5" data-stem="EFFICIENT" contenteditable="false">[5] _____ (<strong>EFFICIENT</strong>)</span> of this cold light: nearly all the energy released becomes visible illumination, producing almost no wasted heat—an <span data-gap="6" data-stem="ACHIEVE" contenteditable="false">[6] _____ (<strong>ACHIEVE</strong>)</span> that human lighting engineers still strive to replicate.</p>`,
    items: [
      { id: 'wf-1', gapNumber: 1, stemWord: 'DARK', acceptedAnswers: ['darkness'], explanation: 'Noun required after "complete".' },
      { id: 'wf-2', gapNumber: 2, stemWord: 'ORDINARY', acceptedAnswers: ['extraordinarily'], explanation: 'Adverb modifying "versatile".' },
      { id: 'wf-3', gapNumber: 3, stemWord: 'RECOGNISE', acceptedAnswers: ['recognition'], explanation: 'Noun required after preposition "for".' },
      { id: 'wf-4', gapNumber: 4, stemWord: 'CONFUSE', acceptedAnswers: ['confusion'], explanation: 'Noun required after "moment of".' },
      { id: 'wf-5', gapNumber: 5, stemWord: 'EFFICIENT', acceptedAnswers: ['efficiency'], explanation: 'Noun required after "the".' },
      { id: 'wf-6', gapNumber: 6, stemWord: 'ACHIEVE', acceptedAnswers: ['achievement'], explanation: 'Singular countable noun after "an".' },
    ],
  },

  // 4. Key Word Transformation
  {
    id: 'sample-kwt',
    type: 'key-word-transformation',
    title: 'Everyday Diplomacy & Nuance',
    subtitle: 'Part 4 · Key Word Transformation',
    instructions: 'Complete the second sentence so that it has a similar meaning to the first sentence, using the word given. Do not change the word given.',
    updatedAt: '2026-11-15T10:15:00Z',
    introHtml: '<p>Use between <strong>three and six words</strong>, including the bold capitalised key word given on the second line.</p>',
    items: [
      {
        id: 'kwt-1',
        number: 1,
        originalSentence: 'I am sure it was purely by chance that Elena arrived at the exact same moment as us.',
        keyWord: 'COINCIDENCE',
        gappedSentence: 'Elena’s arrival at the exact same moment as ours must ________.',
        acceptedAnswers: ['have been a pure coincidence', 'have been pure coincidence'],
        explanation: 'Modal deduction in the past ("must have been") + noun phrase.',
      },
      {
        id: 'kwt-2',
        number: 2,
        originalSentence: 'Local residents strongly opposed the proposal to widen the coastal road.',
        keyWord: 'OBJECTED',
        gappedSentence: 'Local residents ________ the coastal road.',
        acceptedAnswers: ['strongly objected to widening', 'objected strongly to widening', 'strongly objected to the widening of'],
        explanation: '"Object to + -ing / noun" matches "opposed".',
      },
      {
        id: 'kwt-3',
        number: 3,
        originalSentence: 'We only realised how fragile the archive maps were after we unfolded them.',
        keyWord: 'UNTIL',
        gappedSentence: 'Not ________ how fragile the archive maps were.',
        acceptedAnswers: ['until we unfolded them did we realise', 'until we had unfolded them did we realise'],
        explanation: 'Negative inversion: "Not until + clause + auxiliary + subject + verb".',
      },
      {
        id: 'kwt-4',
        number: 4,
        originalSentence: 'Marcus rarely checks his voicemail unless he is expecting an urgent call.',
        keyWord: 'HABIT',
        gappedSentence: 'Marcus is ________ his voicemail unless he is expecting an urgent call.',
        acceptedAnswers: ['not in the habit of checking'],
        explanation: 'Fixed expression "be in the habit of + -ing".',
      },
      {
        id: 'kwt-5',
        number: 5,
        originalSentence: 'Even though the ferry was delayed by fog, nobody complained about waiting.',
        keyWord: 'SPITE',
        gappedSentence: 'Nobody complained about waiting, ________ delayed by fog.',
        acceptedAnswers: ['in spite of the ferry being', 'in spite of the fact that the ferry was'],
        explanation: 'Concessive preposition "in spite of".',
      },
    ],
  },

  // 5. Multiple Choice (Long Text)
  {
    id: 'sample-mc-long',
    type: 'multiple-choice',
    title: 'The Slow Return of the Night Train',
    subtitle: 'Part 5 · Multiple Choice Reading',
    instructions: 'Read the article carefully and choose the answer (A, B, C or D) which you think fits best according to the text.',
    updatedAt: '2026-11-15T10:20:00Z',
    passageHtml: `<h2>Sleeping Through Geography</h2>
<p>For decades, the sleeper train seemed destined to become a museum piece—an atmospheric backdrop for twentieth-century detective novels rather than a practical way to cross a continent. Low-cost airlines compressed thousand-kilometre journeys into ninety-minute hops, while high-speed daytime rail shaved hours off intercity travel. Faced with high staffing costs and aging rolling stock, national operators quietly retired one overnight route after another.</p>
<p>Yet over the past five years, an unexpected reversal has taken hold across Europe. New midnight services now link Vienna to Paris, Brussels to Prague, and Stockholm to Hamburg, often selling out weeks ahead of departure. Part of the appeal is environmental arithmetic: a single overnight train produces a fraction of the carbon emissions of a short-haul flight. Even so, interviews with regular passengers suggest that climate anxiety is only half the story.</p>
<p>What draws many travellers back to the couchette is a subtly altered relationship with time. Boarding at ten in the evening, stowing a bag beneath a narrow bunk, and waking up as mist lifts over an unfamiliar river valley restores a sense of spatial continuity that air travel erases. On a plane, distance becomes an abstract gap between two nearly identical departure lounges; on a sleeper, geography unfolds slowly outside the window while you read or drift off to the metronome of the rails.</p>
<p>Running these services profitably remains stubbornly difficult, however. Unlike daytime express trains, which can complete multiple round trips before midnight, a sleeper carriage earns revenue on only one journey every twenty-four hours. Track access charges, cross-border locomotive swaps, and differing electrical signalling standards further complicate schedules. Rail advocates argue that until governments treat overnight routes as public climate infrastructure rather than strictly commercial ventures, the sleeper revival will remain fragile—admired in glossy travel magazines, yet vulnerable whenever budgets tighten.</p>`,
    items: [
      {
        id: 'mc-1',
        number: 1,
        question: 'In the first paragraph, why did many national operators discontinue overnight train routes?',
        options: [
          'Passengers preferred reading detective novels about trains rather than riding them.',
          'Competition from faster travel modes combined with expensive maintenance and crew costs.',
          'Daytime high-speed rail networks prohibited older carriages from using their tracks.',
          'Governments banned overnight routes to favour regional airports.',
        ],
        correctIndex: 1,
        explanation: 'Paragraph 1 cites low-cost airlines, daytime high-speed rail, high staffing costs, and aging rolling stock.',
      },
      {
        id: 'mc-2',
        number: 2,
        question: 'What does the writer note about passengers choosing modern sleeper routes?',
        options: [
          'They are motivated solely by lower ticket prices compared with flights.',
          'Most of them avoid flying because of strict corporate travel rules.',
          'Environmental concerns only partly explain their enthusiasm for night trains.',
          'They prefer travelling between major hubs like Vienna and Paris.',
        ],
        correctIndex: 2,
        explanation: 'Paragraph 2 states that "climate anxiety is only half the story."',
      },
      {
        id: 'mc-3',
        number: 3,
        question: 'How does the writer contrast air travel with sleeper trains in the third paragraph?',
        options: [
          'Airports feel indistinguishable and disconnect travellers from the landscape crossed.',
          'Airlines provide better sleeping facilities but worse scenery.',
          'Trains are less reliable because river valleys often experience morning mist.',
          'Passengers find it harder to read on aeroplanes than in couchettes.',
        ],
        correctIndex: 0,
        explanation: 'Paragraph 3 contrasts "two nearly identical departure lounges" with "spatial continuity".',
      },
      {
        id: 'mc-4',
        number: 4,
        question: 'What is the main economic obstacle for sleeper train operators?',
        options: [
          'Passengers rarely book tickets far enough in advance.',
          'Travel magazines exaggerate the popularity of overnight routes.',
          'Each sleeper carriage can only generate fare income once per day.',
          'Electrical signalling makes daytime express trains slower.',
        ],
        correctIndex: 2,
        explanation: 'Paragraph 4 explains that a sleeper carriage "earns revenue on only one journey every twenty-four hours."',
      },
    ],
  },

  // 6. Gapped Text (More options than gaps!)
  {
    id: 'sample-gapped-text',
    type: 'gapped-text',
    title: 'Listening to Lost Soundscapes',
    subtitle: 'Part 6 · Gapped Text',
    instructions: 'Four sentences/paragraphs have been removed from the text. Choose from options A–F the one which fits each gap (1–4). There are two extra options which you do not need to use.',
    updatedAt: '2026-11-15T10:25:00Z',
    passageHtml: `<h2>The Acoustic Archaeologists</h2>
<p>When historians study a medieval market square or an eighteenth-century theatre, they usually rely on architectural drawings, surviving masonry, and written diaries. Yet every building also possessed an acoustic signature—a living texture of echoes, footsteps, and street cries that vanished the moment the crowd went home.</p>
<p><span data-gap="1" contenteditable="false">[1]</span></p>
<p>Using detailed laser scans and material samples from surviving stone vaults, researchers can now calculate precisely how sound waves bounced off plaster walls, timber balconies, and tapestries. Once a digital three-dimensional model of a room is complete, acoustic engineers feed dry recordings of speech or music into the virtual space.</p>
<p><span data-gap="2" contenteditable="false">[2]</span></p>
<p>Such reconstructions have already overturned several longstanding assumptions about historical performance. In one celebrated experiment involving a sixteenth-century Venetian church, musicologists discovered that choral compositions written for twin balconies relied on a deliberate two-second reverberation delay.</p>
<p><span data-gap="3" contenteditable="false">[3]</span></p>
<p>Beyond cathedrals and concert halls, acoustic archaeology is increasingly turning toward everyday civic life. By mapping ambient noise levels along cobblestone alleys and narrow workshops, researchers hope to understand how ordinary citizens communicated above the clatter of iron-rimmed cartwheels.</p>
<p><span data-gap="4" contenteditable="false">[4]</span></p>
<p>For visitors wearing headphones inside a modern museum, stepping into one of these reconstructed soundscapes offers a startling form of time travel—one that engages the ear as vividly as a painting engages the eye.</p>`,
    gaps: [
      { id: 'gt-g1', gapNumber: 1, correctLetter: 'B', explanation: 'Introduces the discipline of acoustic archaeology right after the problem of vanished sounds.' },
      { id: 'gt-g2', gapNumber: 2, correctLetter: 'E', explanation: 'Explains what happens once the dry recordings are fed into the virtual model.' },
      { id: 'gt-g3', gapNumber: 3, correctLetter: 'A', explanation: 'Develops the Venetian church example by explaining how composers used the reverberation.' },
      { id: 'gt-g4', gapNumber: 4, correctLetter: 'D', explanation: 'Elaborates on everyday civic noise and public announcements in narrow streets.' },
    ],
    options: [
      {
        id: 'gt-oA',
        letter: 'A',
        html: '<p>Rather than treating that echo as a flaw, composers timed their harmonies so overlapping notes would blend seamlessly in mid-air.</p>',
      },
      {
        id: 'gt-oB',
        letter: 'B',
        html: '<p>Today, a growing field known as acoustic archaeology is attempting to rebuild those vanished sound worlds using computational physics.</p>',
      },
      {
        id: 'gt-oC',
        letter: 'C',
        html: '<p>Many municipal archives have therefore started digitising fragile vinyl records donated by local radio stations.</p>',
      },
      {
        id: 'gt-oD',
        letter: 'D',
        html: '<p>Town criers, for example, instinctively stood at specific stone corners where high walls acted like natural megaphones.</p>',
      },
      {
        id: 'gt-oE',
        letter: 'E',
        html: '<p>The software then simulates thousands of reflections, allowing listeners to hear a sermon or lute solo exactly as an audience member would have heard it.</p>',
      },
      {
        id: 'gt-oF',
        letter: 'F',
        html: '<p>Even so, modern concert audiences generally prefer crisp electronic amplification over natural stone acoustics.</p>',
      },
    ],
  },

  // 7. Multiple Matching (Texts A–E + 10 Questions)
  {
    id: 'sample-multiple-matching',
    type: 'multiple-matching',
    title: 'Five Field Botanists on Seed Hunting',
    subtitle: 'Part 7 · Multiple Matching',
    instructions: 'You are going to read accounts by five field botanists. For questions 1–10, choose from the sections (A–E). The sections may be chosen more than once.',
    updatedAt: '2026-11-15T10:30:00Z',
    texts: [
      {
        id: 'mm-tA',
        letter: 'A',
        title: 'Dr. Clara Lindqvist — Alpine Meadows',
        html: '<p>High-altitude collecting sounds romantic until you spend four days inside a damp tent waiting for sleet to clear. Seeds only mature during a narrow two-week window before the first hard frost, so timing is everything. I keep hand-drawn sketchbooks alongside my GPS logs because sketching forces me to notice tiny leaf hairs that a rushed photograph misses. My biggest frustration is not the weather, though—it is arriving at a slope mapped thirty years ago only to find ski-lift pylons where rare gentians once grew.</p>',
      },
      {
        id: 'mm-tB',
        letter: 'B',
        title: 'Tomasz Kowalski — Coastal Salt Marshes',
        html: '<p>Most people walk past salt marshes assuming nothing of value survives in brackish mud, yet these estuaries hold extraordinary salt-tolerant grasses. Collecting here means reading tide tables as carefully as botanical keys. Twice I have misjudged an incoming channel and ended up wading chest-deep with specimen bags hoisted above my head. Despite the soggy mishaps, I never tire of showing sceptical agricultural students how wild coastal relatives could help breed flood-resilient crops.</p>',
      },
      {
        id: 'mm-tC',
        letter: 'C',
        title: 'Nadia Benali — Semi-Arid Plateaus',
        html: '<p>In dryland regions, wild legumes can lie dormant underground for years until a single erratic downpour triggers germination. Consequently, my fieldwork depends heavily on tips from nomadic herders who know which wadis turned green last month. Without their local memory, a visiting scientist could drive hundreds of kilometres across barren gravel and collect nothing. Every seed batch we store at the national bank is therefore catalogued with the name of the community guide who led us there.</p>',
      },
      {
        id: 'mm-tD',
        letter: 'D',
        title: 'Kenji Watanabe — Temperate Cloud Forests',
        html: '<p>Working beneath dense canopy means climbing into the upper branches rather than scanning the forest floor. Many orchids and epiphytic ferns disperse dust-like seeds from thirty metres up, requiring harness training before you ever touch a specimen jar. Equipment weight limits every expedition: every extra lens means leaving behind drying paper. Still, when a seed packet stored in our vault germinates cleanly five years later, the tedious logistics feel instantly worthwhile.</p>',
      },
      {
        id: 'mm-tE',
        letter: 'E',
        title: 'Miriam Okafor — Urban Wastelands',
        html: '<p>My colleagues fly to distant mountain ranges, while I often take a commuter tram to abandoned railway sidings and demolished factory lots. Surprisingly, disturbed city soil hosts hardy wildflowers that thrive in heat islands and compacted rubble—traits increasingly valuable as summers warm. At first, passers-by assumed I was checking for soil contamination, so I now carry laminated photo cards explaining our seed-banking project. Turning sceptical onlookers into enthusiastic spotters has become my favourite part of the job.</p>',
      },
    ],
    items: [
      { id: 'mm-q1', number: 1, question: 'relies on local inhabitants to locate plants that appear unpredictably?', correctLetter: 'C' },
      { id: 'mm-q2', number: 2, question: 'conducts fieldwork within easy reach of city public transport?', correctLetter: 'E' },
      { id: 'mm-q3', number: 3, question: 'regrets seeing a once-rich habitat altered by commercial construction?', correctLetter: 'A' },
      { id: 'mm-q4', number: 4, question: 'had to acquire specialist climbing skills to reach target specimens?', correctLetter: 'D' },
      { id: 'mm-q5', number: 5, question: 'recalls getting caught out by rapidly changing water levels?', correctLetter: 'B' },
      { id: 'mm-q6', number: 6, question: 'uses visual materials to engage curious members of the public?', correctLetter: 'E' },
      { id: 'mm-q7', number: 7, question: 'prefers an unhurried recording technique over quick digital snapshots?', correctLetter: 'A' },
      { id: 'mm-q8', number: 8, question: 'makes careful trade-offs over what gear to pack?', correctLetter: 'D' },
      { id: 'mm-q9', number: 9, question: 'points out the potential value of overlooked plants for future food security?', correctLetter: 'B' },
      { id: 'mm-q10', number: 10, question: 'formally credits non-specialists in official database records?', correctLetter: 'C' },
    ],
  },

  // 8. Cross-Text Multiple Matching (4 Texts + 4 Questions)
  {
    id: 'sample-cross-text',
    type: 'cross-text-matching',
    title: 'Four Critics on Algorithmic Book Recommendations',
    subtitle: 'Part 8 · Cross-Text Multiple Matching',
    instructions: 'You are going to read four reviews of a study on algorithmic book recommendations. For questions 1–4, choose from the critics (A–D). The critics may be chosen more than once.',
    updatedAt: '2026-11-15T10:35:00Z',
    texts: [
      {
        id: 'ct-tA',
        letter: 'A',
        title: 'Reviewer A — Hannah Mercer',
        html: '<p>The authors of <em>Sorted Shelves</em> make a persuasive case that recommendation engines flatten literary curiosity. Once a reader finishes a Scandinavian thriller, every subsequent carousel serves up near-identical snowy mysteries. While the book rightly praises independent booksellers for sparking serendipitous discoveries, its conclusion that digital storefronts deliberately suppress experimental fiction stretches the evidence. Most platforms simply amplify whatever clicks fastest—a symptom of hurried browsing rather than editorial malice. Moreover, the study relies almost exclusively on surveys of frequent buyers, overlooking casual readers who actually read more widely thanks to personalised prompts.</p>',
      },
      {
        id: 'ct-tB',
        letter: 'B',
        title: 'Reviewer B — David Alvarez',
        html: '<p><em>Sorted Shelves</em> is at its sharpest when comparing neighbourhood bookshops with automated feeds, yet it repeats an all-too-familiar romantic myth about physical browsing. Small shops, constrained by rent and shelf space, often stock a narrower range of translated fiction than major online catalogues. Far from trapping readers in echo chambers, well-tuned algorithms frequently surface out-of-print essays and niche small-press titles that would never survive on a high-street display table. Where the study genuinely breaks new ground is in documenting how star ratings deter readers from trying challenging, slow-burn novels.</p>',
      },
      {
        id: 'ct-tC',
        letter: 'C',
        title: 'Reviewer C — Priya Nair',
        html: '<p>Like Mercer, I suspect <em>Sorted Shelves</em> overstates the notion of intentional cultural gatekeeping by tech firms, though its core warning remains vital. When algorithms reward immediate completion rates, publishers quietly commission shorter chapters and familiar tropes to satisfy the metric. The authors’ fieldwork among independent shopkeepers convincingly captures the irreplaceable value of an informed human conversation at the counter. Sadly, the book’s sample of interviewees skews heavily toward avid weekly readers, leaving unanswered how automated lists influence people returning to reading after years away.</p>',
      },
      {
        id: 'ct-tD',
        letter: 'D',
        title: 'Reviewer D — Oliver Lind',
        html: '<p>Whereas most commentators either demonise recommendation software or celebrate its efficiency, <em>Sorted Shelves</em> offers a refreshingly measured verdict. Its strongest chapters examine how aggregate review scores push readers away from ambiguous or demanding fiction toward safer crowd-pleasers. Admittedly, the authors are unduly harsh on digital platforms for narrowing taste; in practice, curated automated lists can introduce isolated rural readers to international voices unavailable locally. Yet their central claim—that human booksellers foster risk-taking in ways code cannot replicate—rings unmistakably true.</p>',
      },
    ],
    items: [
      {
        id: 'ct-q1',
        number: 1,
        question: 'shares Reviewer A’s scepticism regarding the study’s methodology for selecting participants?',
        correctLetter: 'C',
        explanation: 'Both A and C criticise the sample skewing toward frequent/avid buyers and overlooking casual or returning readers.',
      },
      {
        id: 'ct-q2',
        number: 2,
        question: 'takes a different view from the other three reviewers on the value of independent bookshops?',
        correctLetter: 'B',
        explanation: 'A, C, and D praise independent booksellers, whereas B argues they are a "romantic myth" with narrower stock due to rent/shelf constraints.',
      },
      {
        id: 'ct-q3',
        number: 3,
        question: 'agrees with Reviewer B about the negative impact of reader rating systems on adventurous choices?',
        correctLetter: 'D',
        explanation: 'Both B ("star ratings deter readers from trying challenging, slow-burn novels") and D ("aggregate review scores push readers away from ambiguous or demanding fiction") highlight this.',
      },
      {
        id: 'ct-q4',
        number: 4,
        question: 'echoes Reviewer A’s doubt that online platforms actively plot to sideline unconventional books?',
        correctLetter: 'C',
        explanation: 'C explicitly agrees ("Like Mercer, I suspect Sorted Shelves overstates the notion of intentional cultural gatekeeping").',
      },
    ],
  },
];

export function createBlankExercise(type: ExerciseType): Exercise {
  const now = new Date().toISOString();
  const id = uid('ex');

  switch (type) {
    case 'multiple-choice-cloze':
      return {
        id,
        type,
        title: 'Untitled Multiple Choice Cloze',
        subtitle: 'Part 1 · Multiple Choice Cloze',
        instructions: 'Read the text below and decide which answer best fits each gap.',
        updatedAt: now,
        optionCount: 4,
        passageHtml:
          '<p>Write or paste your reading text here, then place your cursor where you want a gap and click <strong>Insert Gap</strong>. For example: The expedition <span data-gap="1" contenteditable="false">[1]</span> across the ridge at dawn.</p>',
        items: [
          {
            id: uid('mcc'),
            gapNumber: 1,
            options: ['set off', 'turned up', 'gave in', 'held back'],
            correctIndex: 0,
            explanation: '',
          },
        ],
      };

    case 'open-cloze':
      return {
        id,
        type,
        title: 'Untitled Open Cloze',
        subtitle: 'Part 2 · Open Cloze',
        instructions: 'Read the text below and think of the word which best fits each gap.',
        updatedAt: now,
        passageHtml:
          '<p>Write or paste your text here and insert numbered gaps. For example: There was no doubt <span data-gap="1" contenteditable="false">[1]</span> the weather was turning.</p>',
        items: [{ id: uid('oc'), gapNumber: 1, acceptedAnswers: ['that'], explanation: '' }],
      };

    case 'word-formation':
      return {
        id,
        type,
        title: 'Untitled Word Formation',
        subtitle: 'Part 3 · Word Formation',
        instructions: 'Use the word given in capitals next to each gap to form a word that fits in the gap.',
        updatedAt: now,
        passageHtml:
          '<p>Write or paste your text here and click <strong>Insert Root Gap</strong>. For example: Her sudden <span data-gap="1" data-stem="DECIDE" contenteditable="false">[1] _____ (<strong>DECIDE</strong>)</span> surprised everyone.</p>',
        items: [{ id: uid('wf'), gapNumber: 1, stemWord: 'DECIDE', acceptedAnswers: ['decision'], explanation: '' }],
      };

    case 'key-word-transformation':
      return {
        id,
        type,
        title: 'Untitled Key Word Transformation',
        subtitle: 'Part 4 · Key Word Transformation',
        instructions: 'Complete the second sentence so that it has a similar meaning to the first sentence, using the word given.',
        updatedAt: now,
        introHtml: '<p>Use between three and six words, including the bold key word.</p>',
        items: [
          {
            id: uid('kwt'),
            number: 1,
            originalSentence: 'She decided not to accept the job offer after all.',
            keyWord: 'MIND',
            gappedSentence: 'She ________ about accepting the job offer.',
            acceptedAnswers: ['changed her mind'],
            explanation: '',
          },
        ],
      };

    case 'multiple-choice':
      return {
        id,
        type,
        title: 'Untitled Multiple Choice Reading',
        subtitle: 'Part 5 · Multiple Choice',
        instructions: 'Read the passage and choose the best answer for each question.',
        updatedAt: now,
        passageHtml: '<h2>Article Title</h2><p>Write or paste your long reading text here. In Presentation mode, this panel scrolls independently from the questions on the right.</p>',
        items: [
          {
            id: uid('mc'),
            number: 1,
            question: 'What is the main point introduced in the first paragraph?',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 0,
            explanation: '',
          },
        ],
      };

    case 'gapped-text':
      return {
        id,
        type,
        title: 'Untitled Gapped Text',
        subtitle: 'Part 6 · Gapped Text',
        instructions: 'Choose from the sentences/paragraphs A–C the one which fits each gap. There is one extra option.',
        updatedAt: now,
        passageHtml:
          '<p>Write your base text here and insert gap slots where sentences or paragraphs have been removed.</p><p><span data-gap="1" contenteditable="false">[1]</span></p><p>Add the remaining paragraphs below.</p>',
        gaps: [{ id: uid('gtg'), gapNumber: 1, correctLetter: 'A', explanation: '' }],
        options: [
          { id: uid('gtoA'), letter: 'A', html: '<p>First removed sentence or paragraph.</p>' },
          { id: uid('gtoB'), letter: 'B', html: '<p>Extra distractor sentence or paragraph.</p>' },
        ],
      };

    case 'multiple-matching':
      return {
        id,
        type,
        title: 'Untitled Multiple Matching',
        subtitle: 'Part 7 · Multiple Matching',
        instructions: 'For questions 1–10, choose from the sections (A–D). Sections may be chosen more than once.',
        updatedAt: now,
        texts: ['A', 'B', 'C', 'D'].map((letter) => ({
          id: uid('mmt'),
          letter,
          title: `Section ${letter}`,
          html: `<p>Write or paste text ${letter} here.</p>`,
        })),
        items: Array.from({ length: 10 }, (_, idx) => ({
          id: uid('mmq'),
          number: idx + 1,
          question: `Which text mentions question ${idx + 1}?`,
          correctLetter: 'A',
          explanation: '',
        })),
      };

    case 'cross-text-matching':
      return {
        id,
        type,
        title: 'Untitled Cross-Text Multiple Matching',
        subtitle: 'Part 8 · Cross-Text Multiple Matching',
        instructions: 'You are going to read four texts. For questions 1–4, choose from the texts (A–D).',
        updatedAt: now,
        texts: ['A', 'B', 'C', 'D'].map((letter) => ({
          id: uid('ctt'),
          letter,
          title: `Text ${letter}`,
          html: `<p>Write or paste critic/writer ${letter} here.</p>`,
        })),
        items: Array.from({ length: 4 }, (_, idx) => ({
          id: uid('ctq'),
          number: idx + 1,
          question: `Which writer shares/differs on point ${idx + 1}?`,
          correctLetter: 'A',
          explanation: '',
        })),
      };
  }
}
