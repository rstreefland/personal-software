// Regenerate bins.ics after editing the schedule in schedule.js:
//   node bins/generate-ics.js
//
// The output is a subscribable calendar. Each collection is an all-day event
// with an alarm 6h30m before it starts, i.e. 17:30 the evening before, in
// whatever timezone the subscribing device is set to.

const fs = require("fs");
const path = require("path");
const { binSchedule, BIN_TYPES } = require("./schedule.js");

const CALENDAR_NAME = "Bin collections";
const CALENDAR_DOMAIN = "bins.apps.streefland.co.uk";
const ALARM_TRIGGER = "-PT6H30M";
const OUTPUT_PATH = path.join(__dirname, "bins.ics");

function toIcsDate(dateKey) {
  return dateKey.replace(/-/g, "");
}

function getNextDayKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function escapeText(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// RFC 5545 caps content lines at 75 octets; continuations start with a space
function foldLine(line) {
  const chunks = [];
  let remaining = line;

  while (remaining.length > 75) {
    chunks.push(remaining.slice(0, 75));
    remaining = remaining.slice(75);
  }
  chunks.push(remaining);

  return chunks.join("\r\n ");
}

function buildEvent(collectionEntry) {
  const binNames = BIN_TYPES.filter(
    (binType) => collectionEntry[binType.key],
  ).map((binType) => binType.name);
  const summary = binNames.join(", ");
  const startDate = toIcsDate(collectionEntry.date);

  const lines = [
    "BEGIN:VEVENT",
    `UID:${startDate}@${CALENDAR_DOMAIN}`,
    `DTSTAMP:${startDate}T000000Z`,
    `DTSTART;VALUE=DATE:${startDate}`,
    `DTEND;VALUE=DATE:${toIcsDate(getNextDayKey(collectionEntry.date))}`,
    `SUMMARY:${escapeText(summary)}`,
    "TRANSP:TRANSPARENT",
  ];

  if (collectionEntry.note) {
    lines.push(`DESCRIPTION:${escapeText(collectionEntry.note)}`);
  }

  lines.push(
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `TRIGGER:${ALARM_TRIGGER}`,
    `DESCRIPTION:${escapeText(`Put out tonight: ${summary}`)}`,
    "END:VALARM",
    "END:VEVENT",
  );

  return lines;
}

const calendarLines = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//personal-software//bins//EN",
  "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH",
  `X-WR-CALNAME:${CALENDAR_NAME}`,
  "X-WR-CALDESC:Wealden District Council kerbside collections",
  "REFRESH-INTERVAL;VALUE=DURATION:P1D",
  "X-PUBLISHED-TTL:P1D",
  ...binSchedule.flatMap(buildEvent),
  "END:VCALENDAR",
];

fs.writeFileSync(
  OUTPUT_PATH,
  calendarLines.map(foldLine).join("\r\n") + "\r\n",
);

console.log(`Wrote ${binSchedule.length} events to ${OUTPUT_PATH}`);
