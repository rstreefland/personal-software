document.addEventListener("DOMContentLoaded", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) =>
        console.log(
          "Service Worker registered with scope:",
          registration.scope,
        ),
      )
      .catch((error) =>
        console.error("Service Worker registration failed:", error),
      );
  }

  // Thursday: Recycling (green) and General Waste (black) alternate weekly
  // Friday: Garden Waste (garden) collected bi-weekly (except Dec 26)
  const schedule = [
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

  const currentDateDisplay = document.getElementById("current-date-display");
  const weekCollectionsDisplay = document.getElementById(
    "next-collection-date-display",
  );
  const collectionNoteDisplay = document.getElementById("collection-note");
  const binsToPutOutContainer = document.getElementById("bins-to-put-out");
  const updateMessageSection = document.getElementById("update-message");
  const collectionInfoSection = document.getElementById("collection-info");

  const today = new Date();
  // For testing:
  // const today = new Date("2025-12-08T00:00:00Z"); // Day of last collection
  // const today = new Date("2025-11-28T12:00:00Z"); // Day after last collection

  currentDateDisplay.textContent = `Today: ${today.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;

  const todayNormalized = new Date(today);
  todayNormalized.setHours(0, 0, 0, 0);

  function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  }

  // Get start of week (Monday) and end of week (Sunday)
  function getWeekBounds(date) {
    const start = new Date(date);
    const dayOfWeek = start.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  const { start: weekStart, end: weekEnd } = getWeekBounds(todayNormalized);

  // Find all collections for this week that are on or after today
  const weekCollections = schedule.filter((entry) => {
    const collectionDate = new Date(entry.date);
    collectionDate.setHours(0, 0, 0, 0);
    return (
      collectionDate >= todayNormalized &&
      collectionDate >= weekStart &&
      collectionDate <= weekEnd
    );
  });

  if (weekCollections.length > 0) {
    weekCollectionsDisplay.textContent = "This week's collections:";
    collectionNoteDisplay.style.display = "none";
    binsToPutOutContainer.innerHTML = "";

    for (const collectionEntry of weekCollections) {
      const collectionDate = new Date(collectionEntry.date);
      const day = collectionDate.getDate();
      const weekday = collectionDate.toLocaleDateString("en-GB", {
        weekday: "long",
      });
      const ordinalSuffix = getOrdinalSuffix(day);

      let dateLabel;
      const tomorrowNormalized = new Date(todayNormalized);
      tomorrowNormalized.setDate(todayNormalized.getDate() + 1);

      if (collectionDate.toDateString() === todayNormalized.toDateString()) {
        dateLabel = "Today";
      } else if (
        collectionDate.toDateString() === tomorrowNormalized.toDateString()
      ) {
        dateLabel = "Tomorrow";
      } else {
        dateLabel = `${weekday} ${day}${ordinalSuffix}`;
      }

      if (collectionEntry.note) {
        dateLabel += ` (${collectionEntry.note})`;
      }

      // Create a collection day container
      const dayContainer = document.createElement("div");
      dayContainer.className = "collection-day";

      const dateHeader = document.createElement("div");
      dateHeader.className = "collection-date-header";
      dateHeader.textContent = dateLabel;
      dayContainer.appendChild(dateHeader);

      const binsContainer = document.createElement("div");
      binsContainer.className = "bins-for-day";

      if (collectionEntry.black) {
        addBinToContainer(binsContainer, "General Waste", "black-bin", "🗑️");
      }
      if (collectionEntry.green) {
        addBinToContainer(binsContainer, "Recycling", "green-bin", "♻️");
      }
      if (collectionEntry.garden) {
        addBinToContainer(binsContainer, "Garden Waste", "garden-bin", "🌿");
      }

      dayContainer.appendChild(binsContainer);
      binsToPutOutContainer.appendChild(dayContainer);
    }
  } else {
    // No collections this week, show next collection
    const nextCollection = schedule.find((entry) => {
      const collectionDate = new Date(entry.date);
      collectionDate.setHours(0, 0, 0, 0);
      return collectionDate >= todayNormalized;
    });

    if (nextCollection) {
      const collectionDate = new Date(nextCollection.date);
      const day = collectionDate.getDate();
      const weekday = collectionDate.toLocaleDateString("en-GB", {
        weekday: "long",
      });
      const month = collectionDate.toLocaleDateString("en-GB", {
        month: "long",
      });
      const ordinalSuffix = getOrdinalSuffix(day);

      weekCollectionsDisplay.textContent = `No collections this week. Next: ${weekday} ${day}${ordinalSuffix} ${month}`;
      collectionNoteDisplay.style.display = "none";
      binsToPutOutContainer.innerHTML = "";
    } else {
      collectionInfoSection.style.display = "none";
      const updateMessageParagraph = updateMessageSection.querySelector("p");
      if (updateMessageParagraph) {
        updateMessageParagraph.textContent =
          "New bin collection schedule needed. Rhys, please update the app!";
      }
      updateMessageSection.style.display = "block";
    }
  }

  function addBinToContainer(container, name, className, icon) {
    const binDiv = document.createElement("div");
    binDiv.className = `bin ${className}`;

    const iconSpan = document.createElement("span");
    iconSpan.className = "bin-icon";
    iconSpan.textContent = icon;

    const labelSpan = document.createElement("span");
    labelSpan.className = "bin-label";
    labelSpan.textContent = name;

    binDiv.appendChild(iconSpan);
    binDiv.appendChild(labelSpan);
    container.appendChild(binDiv);
  }
});
