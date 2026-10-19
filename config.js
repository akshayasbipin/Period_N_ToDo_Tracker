// Google Apps Script shares top-level declarations across files in the project.
// Keep account-specific names and cycle defaults here rather than in code.js.
const USER_CONFIG = Object.freeze({
  cycleMarker: '🌋🌋🌋',
  sourceCalendarName: 'Cycle',
  outputCalendarName: 'Cycle Plan',
  taskListName: 'KARYA Q',
  defaultCycleLengthDays: 28
});
