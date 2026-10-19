const CATS = ['deep', 'creative', 'admin', 'review', 'maintenance'];
const DAILY_BUDGET_MINUTES = 120; // Duration-aware planning budget
const DEFAULT_TASK_MINUTES = 30;  // Used when duration is not specified

const yt = q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q).replace(/%20/g, '+');

const PHASES = {
  menstrual: {
    label: 'MENSTRUAL', emoji: '🩸', count: 3, prefer: ['maintenance', 'review', 'admin'], preferTags: ['#low-energy', '#quick'],
    yoga: "Yin, child's pose, legs-up-the-wall, gentle walks",
    food: 'Iron-rich: lentils, spinach, beetroot, dates, jaggery; warm meals; lots of water',
    focus: 'Rest, revise, plan the month',
    body: 'Estrogen and progesterone are at their lowest, so energy dips. Cramps come from prostaglandins, and heavy days can feel draining.',
    pain: 'Lower abdomen, lower back, thighs; headaches on days 1-2.',
    physical: 'Not a peak time. Gentle movement only; days 4-5 usually feel lighter.',
    mental: 'Reflective and intuitive: good for reviewing, planning and honest self-assessment.',
    battle: 'Heat pad, warm fluids, magnesium and iron foods, extra sleep, fewer commitments. Walking beats pushing through.',
    journal: 'What did last cycle teach me? What do I want to drop, and what do I want to start?',
    video: yt('gentle yin yoga for period cramps')
  },
  follicular: {
    label: 'FOLLICULAR', emoji: '🌱', count: 5, prefer: ['deep', 'creative', 'review'], preferTags: ['#focus', '#learn'],
    yoga: 'Vinyasa, sun salutations, strength training',
    food: 'Sprouts, fresh veg, eggs/paneer/tofu, fermented foods',
    focus: 'Learn new things, hard problems, brainstorm',
    body: 'Estrogen is rising, so energy, mood and motivation climb. Skin and focus often improve.',
    pain: 'Usually little. Some tiredness in the first days.',
    physical: 'Strength and stamina build. A good window to try harder workouts and new routines.',
    mental: 'Curious and quick to learn. Best window for new DSA topics and complex problems.',
    battle: 'Do not overcommit just because energy is high. Keep sleep steady and pick one big goal.',
    journal: 'What do I want to start this cycle? One big goal and three small steps.',
    video: yt('vinyasa flow yoga 30 minutes')
  },
  ovulation: {
    label: 'OVULATION', emoji: '☀️', count: 4, prefer: ['creative', 'deep', 'admin'], preferTags: ['#social', '#collab', '#visible'],
    yoga: 'Power yoga, dance, cardio',
    food: 'Fibre, fruits, light meals, plenty of hydration',
    focus: 'Shoot, collaborate, be visible',
    body: 'Estrogen peaks and LH surges. Many feel most social and confident. Some notice bloating or a mild one-sided pelvic twinge.',
    pain: 'Mild pelvic twinge, bloating, occasional headache.',
    physical: 'Often peak strength and stamina. Warm up well, as joints can feel looser.',
    mental: 'Peak verbal fluency and confidence: best for camera, talking, collaborating, interviews.',
    battle: 'Hydrate, warm up properly, and do not burn out by saying yes to everything.',
    journal: 'Where did I feel most confident this week? What do I want people to see?',
    video: yt('power yoga flow 30 minutes')
  },
  lutealEarly: {
    label: 'EARLY LUTEAL', emoji: '🍂', count: 5, prefer: ['deep', 'admin', 'review'], preferTags: ['#finish', '#methodical'],
    yoga: 'Steady vinyasa flow, pilates, moderate strength',
    food: 'Complex carbs, protein at each meal, nuts and seeds',
    focus: 'Deep, methodical work and finishing things',
    body: 'Progesterone rises, which usually means calmer and steadier. Appetite increases a little, and stamina starts to decline.',
    pain: 'Breast tenderness and mild bloating for some.',
    physical: 'Good for steady strength and moderate cardio. Slow down gradually.',
    mental: 'Detail-oriented and focused: ideal for the DSA grind and tying up loose ends.',
    battle: 'Eat regular meals with protein and complex carbs to avoid cravings and mood dips.',
    journal: 'What is the one thing I want finished before my period?',
    video: yt('pilates 20 minutes full body')
  },
  lutealLate: {
    label: 'LATE LUTEAL', emoji: '🌙', count: 3, prefer: ['admin', 'maintenance', 'review', 'creative'], preferTags: ['#low-energy', '#quick'],
    yoga: 'Yin, slow stretching, walks, restorative pilates',
    food: 'Magnesium (seeds, nuts, dark chocolate), complex carbs; less caffeine and sugar',
    focus: 'Editing, admin, wrap-up. Avoid big decisions',
    body: 'Hormones drop before the period. Many people get PMS: irritability, low mood, cravings, poor sleep, bloating.',
    pain: 'Cramps starting, back ache, headaches, breast tenderness, bloating.',
    physical: 'Energy is low. Gentle movement helps more than hard training.',
    mental: 'The inner critic gets louder. Good for editing and tidying, poor for big decisions or comparing yourself to others.',
    battle: 'Cut caffeine and sugar spikes, eat magnesium foods, sleep early, and delay big decisions by a few days. Remind yourself: this is hormones, it passes. If mood symptoms are severe every cycle, talk to a doctor.',
    journal: 'What am I feeling, and what is hormones versus real? What can wait until day 6?',
    video: yt('yin yoga for PMS relief')
  }
};

// ---------- cycle maths ----------
function day0(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

function getStarts() {
  const cal = CalendarApp.getCalendarsByName(USER_CONFIG.sourceCalendarName)[0];
  if (!cal) throw new Error('Calendar "' + USER_CONFIG.sourceCalendarName + '" not found');
  const end = new Date(Date.now() + 864e5);
  const start = new Date(end.getTime() - 400 * 864e5);
  const evs = cal.getEvents(start, end).filter(e => e.getTitle().includes(USER_CONFIG.cycleMarker));
  const days = evs.map(e => day0(e.isAllDayEvent() ? e.getAllDayStartDate() : e.getStartTime()));
  const uniq = [...new Set(days.map(d => d.getTime()))].sort((a, b) => a - b).map(t => new Date(t));
  return uniq.filter((d, i) => i === 0 || (d - uniq[i - 1]) / 864e5 > 10);
}

function cycleInfo() {
  const starts = getStarts();
  if (!starts.length) throw new Error('No ' + USER_CONFIG.cycleMarker + ' events found');
  const recent = starts.slice(-6);
  let len = USER_CONFIG.defaultCycleLengthDays;
  if (recent.length >= 2) {
    const gaps = recent.slice(1).map((d, i) => (d - recent[i]) / 864e5);
    len = Math.round(gaps.reduce((a, b) => a + b) / gaps.length);
  }
  const last = starts[starts.length - 1];
  const day = Math.floor((day0(new Date()) - last) / 864e5) + 1;
  const ov = len - 14;
  let key = day <= 5 ? 'menstrual' : day < ov - 1 ? 'follicular' : day <= ov + 1 ? 'ovulation'
          : (day <= ov + 8 ? 'lutealEarly' : 'lutealLate');
  if (day > len + 7) key = 'lutealLate'; // overdue: log a new start
  return { day, len, key, next: new Date(last.getTime() + len * 864e5) };
}

// ---------- task parsing and deterministic classification ----------
// Examples:
//   "deep: Fix SDK tracing | 60m #focus #must-do"
//   "maintenance: Gentle yoga [20m]"
// Full task notes/details are considered as well as the title.
// No Gemini or external LLM calls are used.

function taskText(t) {
  return ((t.title || '') + '\n' + (t.notes || '')).toLowerCase();
}

function explicitLabel(t) {
  const title = (t.title || '').toLowerCase().trim();
  const aliases = {
    deep: 'deep', dsa: 'deep', study: 'deep', code: 'deep', learn: 'deep',
    creative: 'creative', reel: 'creative', reels: 'creative', content: 'creative',
    admin: 'admin', chore: 'admin', errand: 'admin',
    review: 'review', revise: 'review', plan: 'review', journal: 'review',
    maintenance: 'maintenance', maintain: 'maintenance', wellness: 'maintenance',
    selfcare: 'maintenance'
  };
  const m = title.match(/^#([a-z-]+)\b/) || title.match(/^([a-z-]+)\s*[:\-–]/);
  if (m && aliases[m[1]]) return aliases[m[1]];
  const notes = (t.notes || '').toLowerCase();
  const n = notes.match(/(?:^|\n)\s*(?:category\s*:\s*)?(deep|creative|admin|review|maintenance)\s*(?:$|\n)/);
  return n ? n[1] : null;
}

function getDuration(t) {
  const s = (t.title || '') + '\n' + (t.notes || '');
  const patterns = [
    /(?:duration|time)\s*:\s*(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|min|mins|m)?\b/i,
    /\[\s*(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|min|mins|m)\s*\]/i,
    /(?:\||\s)\s*(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|min|mins|m)\b/i
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const unit = (m[2] || 'min').toLowerCase();
      const value = Number(m[1]);
      return Math.max(5, Math.round(/^(h|hr|hrs|hour|hours)$/.test(unit) ? value * 60 : value));
    }
  }
  return null;
}

function getTags(t) {
  const s = (t.title || '') + '\n' + (t.notes || '');
  const matches = s.match(/#[a-z][a-z0-9_-]*/gi) || [];
  return [...new Set(matches.map(x => x.toLowerCase()))];
}

function guess(t) {
  const s = taskText(t);
  const explicit = explicitLabel(t);
  if (explicit) return explicit;

  if (/\b(resume|cv|sell|bill|tax\w*|charger|bank|form|passport|rent|recharge|buy|renew\w*|insurance|visa|errand|appointment)\b/.test(s)) return 'admin';
  if (/\b(yoga|stretch\w*|walk\w*|workout|exercise|mobility|meal prep|laundry|tidy|clean\w*|rest|sleep routine|wind.?down|self.?care)\b/.test(s)) return 'maintenance';
  if (/\b(dsa|leetcode|study|learn\w*|course|cod(e|ing)|algorithm\w*|problems?|project|build|exam|interview|graph|tree|dp|lecture|l{2,3}ms?|ai|ml|sdk|api|otel|obs\w*|libs?|librar\w*|install\w*|setup|set up|debug\w*|deploy\w*|aws|azure|databrick\w*|certificat\w*|tracker|app|backend|database|docker|git\w*|architecture)\b/.test(s)) return 'deep';
  if (/\b(reels?|video|shoot|film\w*|edit\w*|post|content|design\w*|write|writing|blog|script|thumbnail|record\w*|caption\w*|audio|draw\w*|animat\w*|brainstorm\w*)\b/.test(s)) return 'creative';
  if (/\b(revis\w*|review\w*|plan\w*|reflect\w*|journal\w*|notes?|retrospective|weekly planning)\b/.test(s)) return 'review';
  return 'admin';
}

function classify(tasks) {
  const labels = {};
  tasks.forEach(t => { labels[t.id] = explicitLabel(t) || guess(t); });
  return t => labels[t.id] || guess(t);
}

// ---------- pick today's tasks ----------
function pickTasks(key) {
  const cfg = PHASES[key];
  const props = PropertiesService.getUserProperties();
  const list = (Tasks.Tasklists.list().items || []).find(l => l.title.includes(USER_CONFIG.taskListName));
  if (!list) return { tasks: [], error: 'List "' + USER_CONFIG.taskListName + '" not found' };

  const open = (Tasks.Tasks.list(list.id, { showCompleted: false, showHidden: false, maxResults: 100 }).items || [])
    .filter(t => t.title && t.title.trim());
  const catOf = classify(open);
  const byId = {};
  open.forEach(t => byId[t.id] = t);

  const categoryRank = t => {
    const i = cfg.prefer.indexOf(catOf(t));
    return i < 0 ? cfg.prefer.length : i;
  };

  function score(t) {
    const tags = getTags(t);
    const rank = categoryRank(t);
    let points = rank < cfg.prefer.length ? (100 - rank * 20) : 0;

    if (tags.includes('#must-do')) points += 60;
    if (tags.includes('#urgent')) points += 50;
    if (tags.includes('#important')) points += 30;
    if (tags.includes('#quick')) points += 8;
    if (tags.includes('#optional')) points -= 15;
    (cfg.preferTags || []).forEach(tag => { if (tags.includes(tag)) points += 15; });

    if (t.due) {
      const daysLeft = Math.floor((day0(new Date(t.due)) - day0(new Date())) / 864e5);
      if (daysLeft < 0) points += 70;
      else if (daysLeft === 0) points += 60;
      else if (daysLeft <= 2) points += 35;
      else if (daysLeft <= 7) points += 15;
    }

    const duration = getDuration(t);
    if (duration !== null && duration <= 30) points += 8;
    if (duration !== null && duration > 90) points -= 8;
    return points;
  }

  const sorter = (a, b) =>
    score(b) - score(a) ||
    (a.due || '9999').localeCompare(b.due || '9999') ||
    (a.position || '').localeCompare(b.position || '');

  const chosen = [];
  const chosenIds = new Set();
  let minutes = 0;
  const addTask = t => {
    if (!t || chosenIds.has(t.id) || chosen.length >= cfg.count) return false;
    const duration = getDuration(t);
    const taskMinutes = duration === null ? DEFAULT_TASK_MINUTES : duration;
    if (chosen.length > 0 && minutes + taskMinutes > DAILY_BUDGET_MINUTES) return false;
    chosen.push(t);
    chosenIds.add(t.id);
    minutes += taskMinutes;
    return true;
  };

  // Keep pinned tasks when they are still open, but respect count and time budget.
  (JSON.parse(props.getProperty('pins') || '[]')).forEach(id => addTask(byId[id]));

  // Fill remaining slots using category rank, tags, deadlines and duration.
  open.filter(t => !chosenIds.has(t.id)).sort(sorter).forEach(t => {
    if (chosen.length < cfg.count) addTask(t);
  });

  // If nothing fits, still show the highest-scoring task rather than an empty plan.
  if (!chosen.length && open.length) chosen.push(open.slice().sort(sorter)[0]);

  props.setProperty('pins', JSON.stringify(chosen.map(t => t.id)));
  return {
    tasks: chosen.map(t => ({
      title: t.title,
      notes: t.notes || '',
      cat: catOf(t),
      duration: getDuration(t),
      tags: getTags(t),
      score: score(t)
    }))
  };
}

// ---------- write the plan ----------
function syncToday() {
  const c = cycleInfo();
  const p = PHASES[c.key];
  const picked = pickTasks(c.key);
  const props = PropertiesService.getUserProperties();

  const taskLines = picked.error ? [picked.error]
    : picked.tasks.length ? picked.tasks.map(t => {
        const duration = t.duration === null ? '' : ' · ' + t.duration + 'm';
        const tags = t.tags.length ? ' · ' + t.tags.join(' ') : '';
        const details = t.notes ? '\n   Details: ' + t.notes : '';
        return '☐ ' + t.title + '  [' + t.cat + duration + ' · score ' + t.score + tags + ']' + details;
      }) : ['No open tasks in your list'];
  const count = picked.error ? '' : ' · ' + picked.tasks.length + ' tasks';
  const title = `${p.emoji} ${p.label} · Day ${c.day}${count}`;

  const desc = [
    "TODAY'S TASKS", ...taskLines,
    '', 'BODY: ' + p.body, 'PAIN WATCH: ' + p.pain,
    'BEST PHYSICALLY: ' + p.physical, 'BEST MENTALLY: ' + p.mental,
    'BATTLE IT: ' + p.battle, 'JOURNAL: ' + p.journal, 'VIDEO: ' + p.video,
    '', 'Focus: ' + p.focus, 'Yoga: ' + p.yoga, 'Food: ' + p.food,
    'Next period: ' + c.next.toDateString(),
    '', 'General wellness info, not medical advice. See a doctor for severe pain or big changes.'
  ].join('\n');

  const sig = day0(new Date()).toDateString() + '|' + title + '|' + taskLines.join('|');
  const cal = CalendarApp.getCalendarsByName(USER_CONFIG.outputCalendarName)[0]
    || CalendarApp.createCalendar(USER_CONFIG.outputCalendarName);
  const now = new Date();
  const existing = cal.getEventsForDay(now);
  if (existing.length && props.getProperty('sig') === sig) return;

  existing.forEach(e => e.deleteEvent());   // only touches the configured output calendar
  cal.createAllDayEvent(title, now, { description: desc });
  props.setProperty('sig', sig);
}

// Run ONCE. Safe to re-run (clears old triggers first).
function install() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncToday').timeBased().everyMinutes(30).create();
  syncToday();
}

// Optional: run if you want to start fresh (clears pins, cached labels)
function resetAll() {
  const p = PropertiesService.getUserProperties();
  ['pins', 'cls', 'sig'].forEach(k => p.deleteProperty(k));
}