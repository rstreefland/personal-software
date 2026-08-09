// Shared by the app (index.html) and the calendar generator (generate-ics.js).
// After editing the schedule below, regenerate the calendar feed:
//   node bins/generate-ics.js
// Tuesday: Food Waste (food) collected weekly, generated below
// Thursday: Recycling (green) and General Waste (black) alternate weekly
// Friday: Garden Waste (garden) collected bi-weekly (except Dec 26)
const kerbsideSchedule = [
  // December 2025
  { date: "2025-12-04", green: false, black: true },
  { date: "2025-12-11", green: true, black: false },
  { date: "2025-12-12", garden: true },
  { date: "2025-12-18", green: false, black: true },
  // No garden collection on Dec 26
  { date: "2025-12-27", green: true, black: false, note: "Christmas revised day" },
  // January 2026
  { date: "2026-01-03", green: false, black: true, note: "New Year revised day" },
  { date: "2026-01-09", green: true, black: false, garden: true, note: "Revised day" },
  { date: "2026-01-15", green: false, black: true },
  { date: "2026-01-22", green: true, black: false },
  { date: "2026-01-23", garden: true },
  { date: "2026-01-29", green: false, black: true },
  // February 2026
  { date: "2026-02-05", green: true, black: false },
  { date: "2026-02-06", garden: true },
  { date: "2026-02-12", green: false, black: true },
  { date: "2026-02-19", green: true, black: false },
  { date: "2026-02-20", garden: true },
  { date: "2026-02-26", green: false, black: true },
  // March 2026
  { date: "2026-03-05", green: true, black: false },
  { date: "2026-03-06", garden: true },
  { date: "2026-03-12", green: false, black: true },
  { date: "2026-03-19", green: true, black: false },
  { date: "2026-03-20", garden: true },
  { date: "2026-03-26", green: false, black: true },
  // April 2026
  { date: "2026-04-02", green: true, black: false },
  { date: "2026-04-03", garden: true },
  { date: "2026-04-09", green: false, black: true },
  { date: "2026-04-16", green: true, black: false },
  { date: "2026-04-17", garden: true },
  { date: "2026-04-23", green: false, black: true },
  { date: "2026-04-30", green: true, black: false },
  // May 2026
  { date: "2026-05-01", garden: true },
  { date: "2026-05-07", green: false, black: true },
  { date: "2026-05-14", green: true, black: false },
  { date: "2026-05-15", garden: true },
  { date: "2026-05-21", green: false, black: true },
  { date: "2026-05-28", green: true, black: false },
  { date: "2026-05-29", garden: true },
  // June 2026
  { date: "2026-06-04", green: false, black: true },
  { date: "2026-06-11", green: true, black: false },
  { date: "2026-06-12", garden: true },
  { date: "2026-06-18", green: false, black: true },
  { date: "2026-06-25", green: true, black: false },
  { date: "2026-06-26", garden: true },
  // July 2026
  { date: "2026-07-02", green: false, black: true },
  { date: "2026-07-09", green: true, black: false },
  { date: "2026-07-10", garden: true },
  { date: "2026-07-16", green: false, black: true },
  { date: "2026-07-23", green: true, black: false },
  { date: "2026-07-24", garden: true },
  { date: "2026-07-30", green: false, black: true },
  // August 2026
  { date: "2026-08-06", green: true, black: false },
  { date: "2026-08-07", garden: true },
  { date: "2026-08-13", green: false, black: true },
  { date: "2026-08-20", green: true, black: false },
  { date: "2026-08-21", garden: true },
  { date: "2026-08-27", green: false, black: true },
  // September 2026
  { date: "2026-09-03", green: true, black: false },
  { date: "2026-09-04", garden: true },
  { date: "2026-09-10", green: false, black: true },
  { date: "2026-09-17", green: true, black: false },
  { date: "2026-09-18", garden: true },
  { date: "2026-09-24", green: false, black: true },
  // October 2026
  { date: "2026-10-01", green: true, black: false },
  { date: "2026-10-02", garden: true },
  { date: "2026-10-08", green: false, black: true },
  { date: "2026-10-15", green: true, black: false },
  { date: "2026-10-16", garden: true },
  { date: "2026-10-22", green: false, black: true },
  { date: "2026-10-29", green: true, black: false },
  { date: "2026-10-30", garden: true },
  // November 2026
  { date: "2026-11-05", green: false, black: true },
  { date: "2026-11-12", green: true, black: false },
  { date: "2026-11-13", garden: true },
  { date: "2026-11-19", green: false, black: true },
  { date: "2026-11-26", green: true, black: false },
  { date: "2026-11-27", garden: true },
  // December 2026
  { date: "2026-12-03", green: false, black: true },
  { date: "2026-12-10", green: true, black: false },
  { date: "2026-12-11", garden: true },
  { date: "2026-12-17", green: false, black: true },
];

const TUESDAY = 2;

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeeklyFoodCollections(firstDateKey, lastDateKey) {
  const lastDate = new Date(lastDateKey);
  const nextTuesday = new Date(firstDateKey);
  const daysUntilTuesday = (TUESDAY - nextTuesday.getDay() + 7) % 7;
  nextTuesday.setDate(nextTuesday.getDate() + daysUntilTuesday);

  const collections = [];
  while (nextTuesday <= lastDate) {
    collections.push({ date: formatDateKey(nextTuesday), food: true });
    nextTuesday.setDate(nextTuesday.getDate() + 7);
  }

  return collections;
}

const foodCollections = getWeeklyFoodCollections(
  kerbsideSchedule[0].date,
  kerbsideSchedule[kerbsideSchedule.length - 1].date,
);

const binSchedule = [...kerbsideSchedule, ...foodCollections].sort((a, b) =>
  a.date.localeCompare(b.date),
);

const BIN_TYPES = [
  { key: "black", name: "General waste", className: "black-bin" },
  { key: "green", name: "Recycling", className: "green-bin" },
  { key: "food", name: "Food waste", className: "food-bin" },
  { key: "garden", name: "Garden waste", className: "garden-bin" },
];

if (typeof module !== "undefined") {
  module.exports = { binSchedule, BIN_TYPES };
}
