# Cycle-Aware Planner: Project Summary

A free, private, phase-aware daily planner. It reads your period dates from Google Calendar, works out which cycle phase you are in, picks tasks from your Google Tasks list that suit that phase, and writes one daily event into a calendar that shows up as a widget on your phone.

> General wellness information only, not medical advice. If your cycles are very irregular or painful, or your mood symptoms are severe every cycle, see a doctor.

---

## 1. What the project is

**Goal:** plan life around the menstrual cycle, privately and for free.

- You mark day 1 of your period in Google Calendar as `🌋🌋🌋`.
- The app calculates your cycle day and phase.
- Every day it writes **one event** into a calendar called `Cycle Plan` containing:
  - the phase and day number (title)
  - today's task checklist, chosen from your task list (description)
  - what is happening in your body, where pain tends to show up, best physical and mental windows, how to battle the rough parts, a journal prompt, a YouTube search link, yoga, food and focus advice
  - predicted next period date
- It runs automatically every 30 minutes in the cloud, so your phone and laptop stay in sync with no server of your own.

### Why it keeps continuity ("no DSA today, reels tomorrow")

- Each phase prefers certain **buckets** of work (see section 5).
- Tasks picked earlier are **pinned** and are considered first while they remain open and fit the current task-count/time budget.
- New tasks fill remaining slots, so your focus does not hop around as much.

---

## 2. Architecture

```text
Google Calendar "Cycle"  (🌋🌋🌋 day-1 markers; read-only)
        │
        ▼
Google Apps Script  (runs in YOUR Google account, every 30 min)
        │
        ├── reads Google Tasks list "KARYA Q"
        ├── reads task titles AND full notes/details
        ├── classifies tasks locally using explicit labels + keywords
        ├── parses duration and hashtag tags
        ├── scores tasks for the current cycle phase
        └── selects tasks within a 120-minute estimated daily budget
        ▼
Google Calendar "Cycle Plan"  (one all-day event per day)
        │
        ▼
Google Calendar widget on phone / laptop browser
```

**No Gemini or other LLM calls are used.** Task categorisation and scoring are deterministic and happen inside Apps Script. The script does not send task titles, notes, period dates, or phase information to an external AI service.

**Privacy and write scope:** the source `Cycle` calendar is read-only to this script. It deletes/recreates same-day events only in `Cycle Plan`. The script runs under your Google account and uses Google permissions you approve.

---

## 3. Technologies used, with links

| Technology | What it is used for | Link |
|---|---|---|
| Google Apps Script | Runs the JavaScript in Google's cloud on a schedule | https://script.google.com |
| Apps Script documentation | Reference for the services below | https://developers.google.com/apps-script |
| Calendar Service (`CalendarApp`) | Reads `🌋🌋🌋` markers and writes the daily plan | https://developers.google.com/apps-script/reference/calendar |
| Google Calendar | Cycle data source, output calendar and widget | https://calendar.google.com |
| Google Tasks | Task board | https://support.google.com/tasks |
| Tasks API (Advanced Service) | Lets the script read Google Tasks | https://developers.google.com/tasks |
| Advanced Google services guide | How to enable Tasks in Apps Script | https://developers.google.com/apps-script/guides/services/advanced |
| Properties Service | Stores pinned task IDs and the last output signature | https://developers.google.com/apps-script/reference/properties |
| Installable triggers | Runs `syncToday` every 30 minutes | https://developers.google.com/apps-script/guides/triggers/installable |
| Apps Script quotas | Daily limits for triggers and execution | https://developers.google.com/apps-script/guides/services/quotas |
| YouTube search | The plan includes a phase-specific search link | https://www.youtube.com |


## 4. What Google Apps Script is and how it works

**What it is:** Apps Script is Google's free scripting platform. You write JavaScript in a browser editor at script.google.com, and Google runs it on its servers under your account. It has built-in access to Calendar, Tasks, Drive, Gmail and more, so you need no hosting, database or login code.

**Key concepts used in this project:**

1. **Services.** Built-in objects such as `CalendarApp` give direct access to your calendars. `Tasks` is an *Advanced Service* that you enable manually from the sidebar (Services, +, Google Tasks API).
2. **Permissions (OAuth).** The first time you run a function, Google asks you to approve what the script may access. It acts only as you, on your own data.
3. **Triggers.** A trigger runs a function on a schedule without you. Triggers can only be created by running code once, which is what `install()` does. After that it runs on its own, even when your phone and laptop are off. You only re-run `install()` if you deleted the trigger or Google revoked permissions.
4. **Properties.** `PropertiesService` is a small key-value store attached to your script. This project stores:
   - `pins`: task IDs selected in the previous run; open tasks may be retained for continuity
   - `sig`: a signature of the last plan written, so the calendar is rewritten only when the plan changes
   - The current script does not need a Gemini key or any external AI API key.
5. **Execution log.** Every run shows in the Execution log, which is how errors were found during setup.
6. **Quotas.** Apps Script has daily execution and trigger limits. The script uses a short scheduled run and does not make external AI API calls.

**Run order that matters:**

1. Pick the function in the editor dropdown (not the first one by default).
2. `resetAll` clears saved pins and the last-output signature (plus a legacy label-cache property from the older version).
3. `install` sets the trigger and runs the first sync.
4. `syncToday` can be run manually any time to test.

---

## 5. How tasks are chosen

### The five categories

| Category | What goes in it | Examples |
|---|---|---|
| **deep** | Focused thinking and learning | DSA, coding, debugging, building, certifications, technical study |
| **creative** | Making or sharing something | Reels, writing, editing, designing, drawing, animation, brainstorming |
| **admin** | Errands and practical logistics | Forms, bills, selling something, appointments, renewals |
| **review** | Looking back or planning ahead | Revising notes, weekly planning, reflection, journaling |
| **maintenance** | Looking after your body, space or routines | Yoga, stretching, walks, workouts, mobility, meal prep, laundry, tidying, sleep routines, self-care |

### Phases, preferred categories and task count

The preferred category order is a ranking, not a strict filter. Tasks in any category can still be considered, but preferred categories start with a higher score.

| Phase | Preferred categories (highest priority first) | Max tasks |
|---|---|---:|
| Menstrual | maintenance, review, admin | 3 |
| Follicular | deep, creative, review | 5 |
| Ovulation | creative, deep, admin | 4 |
| Early luteal | deep, admin, review | 5 |
| Late luteal | admin, maintenance, review, creative | 3 |

The script also has a **120-minute daily time budget**. If a task has no duration, it is estimated as 30 minutes. It selects tasks in score order while respecting the category-specific task count and time budget. If no task fits, it still shows the highest-scoring task rather than leaving the plan empty.

### Cycle maths

- **Cycle starts:** events on the `Cycle` calendar whose titles contain the exact marker string `🌋🌋🌋`. Events on the same date are collapsed into one start; gaps of 10 days or less are treated as part of the same marking, not a new cycle.
- **Cycle length:** average gap across the latest up to 6 starts; defaults to 28 days if fewer than 2 starts are available.
- **Today's cycle day:** days since the latest start, plus 1.
- **Estimated ovulation day:** cycle length minus 14.
- **Overdue:** if the calculated day exceeds cycle length plus 7, the planner stays in late luteal until a new start is logged.
- These are estimates; real cycle phases and symptoms vary from person to person.

---

## 6. Task categories, duration, tags and scoring

The current script is fully rule-based. It does not call Gemini or another LLM. It reads both the task **title** and its full **notes/details** for category detection, duration, and hashtags.

### A. Set a category manually when you want to override the guess

Put a category at the beginning of the task title:

| Example title | Category |
|---|---|
| `deep: Debug SDK tracing` | deep |
| `creative: Edit journaling reel` | creative |
| `admin: Fill the FD form` | admin |
| `review: Review weekly notes` | review |
| `maintenance: Gentle yoga` | maintenance |

You can use `#category` at the start instead, such as `#deep Debug SDK tracing`. Aliases include `dsa:`, `study:`, `code:`, `learn:` for deep; `reel:`, `reels:`, `content:` for creative; `chore:`, `errand:` for admin; `revise:`, `plan:`, `journal:` for review; and `maintain:`, `wellness:`, `selfcare:` for maintenance.

Alternatively, put a category by itself on a line in the task notes, for example `category: maintenance`. Explicit category labels take priority over the automatic keyword guess.

### B. Automatic category guessing

If there is no explicit category, the script checks the lowercased title plus notes against keyword groups. The first matching group wins, in this order:

1. **Admin:** practical terms such as resume, sell, bill, tax, bank, form, passport, rent, renew, insurance, visa, errand, appointment.
2. **Maintenance:** yoga, stretching, walking, workout, exercise, mobility, meal prep, laundry, cleaning, rest, sleep routine, wind-down, self-care.
3. **Deep:** DSA, study, code, algorithm, project, build, exam, interview, AI/ML, SDK/API, debugging, deployment, cloud, certification, backend, database, Docker, Git, architecture, and related terms.
4. **Creative:** reels, video, shooting, editing, content, design, writing, blog, script, captions, drawing, animation, brainstorming.
5. **Review:** revision, review, planning, reflection, journaling, notes, retrospective.
6. **Default:** admin, if nothing matches.

Because this is keyword matching, a vague task can be guessed incorrectly. Add an explicit category prefix if you want certainty.

### C. Duration: optional, in the title or notes

Duration is used to estimate the daily time budget and contributes a small scoring adjustment. Examples the parser supports include:

- `deep: Debug SDK tracing | 60m #focus`
- `creative: Edit journaling reel [45m] #optional`
- `maintenance: Gentle yoga | 20m #low-energy`
- `Duration: 1.5h` in the notes
- `time: 30 min` in the notes

It recognises minute and hour forms such as `m`, `min`, `mins`, `h`, `hr`, `hrs`, `hour`, and `hours`. Parsed durations are rounded to minutes and clamped to a minimum of 5 minutes. If no duration is provided, the planner assumes **30 minutes** for budget calculations. A duration over 90 minutes gets a small score penalty, and a duration of 30 minutes or less gets a small bonus.

### D. How hashtag tags work

Hashtags can be in the task title **or anywhere in the notes**. They are extracted automatically; you do not need to register them in a separate list. Tags do not change the category unless the tag is used as a category label at the beginning, such as `#deep`.

**Priority tags** that affect score:

| Tag | Score adjustment | Meaning |
|---|---:|---|
| `#must-do` | +60 | Strongly prioritise this task |
| `#urgent` | +50 | Strongly prioritise this task |
| `#important` | +30 | Give it extra priority |
| `#quick` | +8 | Small boost; also preferred in menstrual/late-luteal phases |
| `#optional` | −15 | Lower priority |

**Phase-specific tags** receive **+15 points each** when the current phase prefers them:

| Phase | Tags that get the +15 bonus |
|---|---|
| Menstrual | `#low-energy`, `#quick` |
| Follicular | `#focus`, `#learn` |
| Ovulation | `#social`, `#collab`, `#visible` |
| Early luteal | `#finish`, `#methodical` |
| Late luteal | `#low-energy`, `#quick` |

A tag that is not listed for the current phase has no phase-specific effect. You can add several tags; each matching preferred tag gets its own bonus. Avoid contradictory tags (for example, `#must-do #optional`) unless you intentionally want their points to offset one another.

### E. Exactly how the task score is calculated

The script computes a score for each open task. Higher scores sort earlier. The score is a **heuristic ranking**, not a percentage or a measure of how important the task is in real life. Due-date points come from the task's Google Tasks due date (`t.due`), not from text like “due tomorrow” in the notes.

| Rule | Points |
|---|---:|
| First preferred category for this phase | +100 |
| Second preferred category | +80 |
| Third preferred category | +60 |
| Fourth preferred category | +40 |
| Category not listed in this phase's preferences | +0 |
| `#must-do` | +60 |
| `#urgent` | +50 |
| `#important` | +30 |
| `#quick` | +8 |
| `#optional` | −15 |
| Each hashtag preferred by the current phase | +15 |
| Due date overdue | +70 |
| Due today | +60 |
| Due within the next 2 days | +35 |
| Due within the next 7 days (but more than 2 days away) | +15 |
| Explicit duration of 30 minutes or less | +8 |
| Explicit duration over 90 minutes | −8 |

Bonuses stack. For example, a task can get category points, a `#must-do` bonus, a phase-tag bonus, and a due-date bonus all at once. A task with no explicit duration does not get either duration score adjustment, even though it is assumed to take 30 minutes for time-budget selection.

**Worked example — follicular phase**

Suppose the task is `deep: Finish API debugging | 25m #must-do #focus`, with a due date tomorrow. Its score would be:

- `deep` is the first preferred category: **+100**
- `#must-do`: **+60**
- `#focus` is preferred in follicular: **+15**
- Due within 2 days: **+35**
- Duration is 30 minutes or less: **+8**

**Total: 218 points.**

### F. How selection works after scoring

1. The script reads up to 100 open tasks from the Google Tasks list whose name contains `KARYA Q`.
2. It computes each task's category, tags, duration and score.
3. Previously selected task IDs are considered first to preserve continuity, provided the tasks are still open and fit the current phase's task-count and time limits.
4. Remaining tasks are considered in descending score order.
5. It adds a task only if it fits the phase's maximum task count and the 120-minute budget. A task with no duration is counted as 30 minutes. The first task is still allowed even if it alone exceeds the budget, so a plan can always contain a task.
6. If nothing has been selected, the highest-scoring open task is used as a fallback.
7. The daily calendar description shows each selected task's category, parsed duration (if any), score, hashtags, and notes/details.

**Important continuity detail:** pinned tasks are kept before newly scored tasks when they still fit. So the plan is not always a pure top-score list; that is intentional to avoid changing the plan every 30 minutes. Complete a task in Google Tasks to remove it from the open-task pool.

---

## 7. Setup, start to finish

1. In Google Calendar, make sure a calendar named exactly **Cycle** holds your `🌋🌋🌋` markers.
2. In Google Tasks, have a list whose name contains **KARYA Q** (for example `KARYA Q 🌱`).
3. Go to https://script.google.com and create a new project.
4. In the left sidebar choose **Services (+)** and add **Google Tasks API**.
5. Delete the default code and paste the full script from section 9. Save.
6. Select **`resetAll`** in the dropdown and Run if you want to clear old saved pins/state from a previous version. This is optional; it clears the planner's saved properties.
7. Select **`install`** and Run. Approve the permissions. This sets the 30-minute trigger and writes today's plan.
8. In Google Calendar, a calendar named **Cycle Plan** is created if it does not already exist. In the Google Calendar widget on your phone, show only `Cycle Plan`.
9. Tap the daily event to read the task checklist and the body, journal and wellness details. The widget itself usually shows only the event title.

### Day-to-day use

- Add tasks to the Google Tasks list whose name contains `KARYA Q`. The planner checks up to 100 open tasks every 30 minutes.
- Optional title examples: `deep: Debug SDK tracing | 60m #focus #must-do`, `creative: Edit reel [45m] #optional`, `maintenance: Gentle yoga | 20m #low-energy`.
- You can put details, `category: maintenance`, duration, and hashtags in task notes too.
- Complete a task in Google Tasks to remove it from future selections.
- Log each new period as `🌋🌋🌋` on the `Cycle` calendar.

---

## 8. Troubleshooting

| Symptom | Possible cause | Fix |
|---|---|---|
| `Cannot read properties of undefined (reading 'getFullYear')` | A helper such as `day0` was run directly from the editor | Select `syncToday` or `install` instead |
| `No 🌋🌋🌋 events found` | No matching marker on the `Cycle` calendar, or calendar name differs | Confirm the calendar is named exactly `Cycle` and the event title contains `🌋🌋🌋` |
| `Tasks is not defined` | Tasks API service not added | Sidebar → Services → + → Google Tasks API |
| `List "KARYA Q" not found` | No task list name contains `KARYA Q` | Check the Google Tasks list name |
| A task has the wrong category | Automatic keyword guessing matched the wrong term or no term | Add an explicit prefix such as `maintenance:` or `#deep` |
| A task does not appear | It may be completed, outside the first 100 open tasks, lower priority, or blocked by task count/time budget | Check task status, duration, due date and tags; try a shorter duration or a relevant priority tag |
| The score looks unexpectedly high | Score bonuses stack | Review the category, due date, priority tags and phase-preferred tags shown in the event |
| Plan not updating | The signature is unchanged, or the trigger/permissions are missing | Run `syncToday` manually; if needed, run `install` again |
| Duplicate or stale events | Old events already exist in `Cycle Plan` | The script replaces that day's events when the plan signature changes; check that no other automation writes to `Cycle Plan` |
| Cycle phase seems wrong | Marker date, cycle length estimate or phase boundaries may not match your experience | Check the marker dates and remember phase timing is estimated; edit the phase rules if desired |

---

## 9. Full script (`Code.gs`)

The code below is the latest deterministic version. It uses the `🌋🌋🌋` marker, includes the `maintenance` category, parses durations and hashtags from titles and notes, scores tasks, and does not call Gemini or any other LLM.

```javascript
const MARKER = '🌋🌋🌋';
const SOURCE_CAL = 'Cycle';        // your period markers (never modified)
const OUTPUT_CAL = 'Cycle Plan';   // daily plan is written here
const TASK_LIST_KEY = 'KARYA Q';   // matches "KARYA Q 🌱"
const DEFAULT_LEN = 28;
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
  const cal = CalendarApp.getCalendarsByName(SOURCE_CAL)[0];
  if (!cal) throw new Error('Calendar "' + SOURCE_CAL + '" not found');
  const end = new Date(Date.now() + 864e5);
  const start = new Date(end.getTime() - 400 * 864e5);
  const evs = cal.getEvents(start, end).filter(e => e.getTitle().includes(MARKER));
  const days = evs.map(e => day0(e.isAllDayEvent() ? e.getAllDayStartDate() : e.getStartTime()));
  const uniq = [...new Set(days.map(d => d.getTime()))].sort((a, b) => a - b).map(t => new Date(t));
  return uniq.filter((d, i) => i === 0 || (d - uniq[i - 1]) / 864e5 > 10);
}

function cycleInfo() {
  const starts = getStarts();
  if (!starts.length) throw new Error('No ' + MARKER + ' events found');
  const recent = starts.slice(-6);
  let len = DEFAULT_LEN;
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
  const list = (Tasks.Tasklists.list().items || []).find(l => l.title.includes(TASK_LIST_KEY));
  if (!list) return { tasks: [], error: 'List "' + TASK_LIST_KEY + '" not found' };

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
  const cal = CalendarApp.getCalendarsByName(OUTPUT_CAL)[0] || CalendarApp.createCalendar(OUTPUT_CAL);
  const now = new Date();
  const existing = cal.getEventsForDay(now);
  if (existing.length && props.getProperty('sig') === sig) return;

  existing.forEach(e => e.deleteEvent());   // only touches Cycle Plan
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
```

---

## 10. Safety notes

- The `Cycle` calendar is only ever **read**. The script deletes and rewrites events only on `Cycle Plan`.
- The current script does not require a Gemini key and makes no external AI API calls.
- The script is not a web app, so there is no public link to protect.
- Yoga, food and phase advice are general wellness guidelines. Edit the `PHASES` table to match what works for your body.

---

## 11. Possible next steps

1. A prettier home-screen widget: Scriptable on iPhone (https://scriptable.app) or a native Android widget with Jetpack Glance (https://developer.android.com/jetpack/compose/glance).
2. Show the top task in the event title so it is visible on the widget without tapping.
3. If you later want AI-generated personalised notes, consider a separate opt-in local LLM with Ollama (https://ollama.com); it is not part of the current implementation.
4. A symptom log, so the app can learn your personal pattern over several cycles.
