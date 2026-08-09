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

  const WHEELIE_BIN_SVG = `
    <svg viewBox="0 0 44 54" aria-hidden="true" focusable="false">
      <g class="wheelie-bin-lid">
        <rect x="4" y="7" width="36" height="6.4" rx="2.6" />
        <rect x="17.5" y="2.6" width="9" height="4.4" rx="2.2" />
      </g>
      <path d="M7.4 15.4h29.2l-2.6 25.9a3.4 3.4 0 0 1-3.4 3.1H13.4a3.4 3.4 0 0 1-3.4-3.1z" />
      <g class="wheelie-bin-wheel">
        <circle cx="14.5" cy="48.4" r="4.6" />
        <rect class="wheelie-bin-spoke" x="13.8" y="44.5" width="1.4" height="7.8" rx="0.7" />
      </g>
      <g class="wheelie-bin-wheel">
        <circle cx="29.5" cy="48.4" r="4.6" />
        <rect class="wheelie-bin-spoke" x="28.8" y="44.5" width="1.4" height="7.8" rx="0.7" />
      </g>
    </svg>`;

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

  currentDateDisplay.textContent = today.toLocaleDateString("en-GB", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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
  const weekCollections = binSchedule.filter((entry) => {
    const collectionDate = new Date(entry.date);
    collectionDate.setHours(0, 0, 0, 0);
    return (
      collectionDate >= todayNormalized &&
      collectionDate >= weekStart &&
      collectionDate <= weekEnd
    );
  });

  if (weekCollections.length > 0) {
    weekCollectionsDisplay.textContent = "Put out this week";
    collectionNoteDisplay.style.display = "none";
    binsToPutOutContainer.innerHTML = "";

    for (const collectionEntry of weekCollections) {
      binsToPutOutContainer.appendChild(
        buildCollectionDay({ collectionEntry, isUpcoming: false }),
      );
    }
  } else {
    // No collections this week, show next collection
    const nextCollection = binSchedule.find((entry) => {
      const collectionDate = new Date(entry.date);
      collectionDate.setHours(0, 0, 0, 0);
      return collectionDate >= todayNormalized;
    });

    if (nextCollection) {
      weekCollectionsDisplay.textContent = "Nothing left this week";
      collectionNoteDisplay.style.display = "none";
      binsToPutOutContainer.innerHTML = "";
      binsToPutOutContainer.appendChild(
        buildCollectionDay({
          collectionEntry: nextCollection,
          isUpcoming: true,
        }),
      );
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

  function buildWheelieBin(binKey) {
    const wheelieBin = document.createElement("span");
    wheelieBin.className = `wheelie-bin wheelie-bin--${binKey}`;
    wheelieBin.innerHTML = WHEELIE_BIN_SVG;
    return wheelieBin;
  }

  function buildSpan({ className, text }) {
    const span = document.createElement("span");
    span.className = className;
    span.textContent = text;
    return span;
  }

  function formatCollectionDate(collectionDate) {
    const day = collectionDate.getDate();
    const weekday = collectionDate.toLocaleDateString("en-GB", {
      weekday: "long",
    });
    const month = collectionDate.toLocaleDateString("en-GB", { month: "long" });
    return `${weekday} ${day}${getOrdinalSuffix(day)} ${month}`;
  }

  function getDayFlag(collectionDate) {
    const tomorrowNormalized = new Date(todayNormalized);
    tomorrowNormalized.setDate(todayNormalized.getDate() + 1);

    if (collectionDate.toDateString() === todayNormalized.toDateString()) {
      return "Today";
    }
    if (collectionDate.toDateString() === tomorrowNormalized.toDateString()) {
      return "Tomorrow";
    }
    return null;
  }

  function buildCollectionDay({ collectionEntry, isUpcoming }) {
    const collectionDate = new Date(collectionEntry.date);
    const binsForDay = BIN_TYPES.filter((binType) => collectionEntry[binType.key]);

    const dayContainer = document.createElement("div");
    dayContainer.className = isUpcoming
      ? "collection-day is-upcoming"
      : "collection-day";

    const dateHeader = document.createElement("div");
    dateHeader.className = "collection-date-header";

    const dayFlag = isUpcoming ? "Next" : getDayFlag(collectionDate);
    if (dayFlag) {
      dateHeader.appendChild(buildSpan({ className: "day-flag", text: dayFlag }));
    }
    dateHeader.appendChild(
      buildSpan({
        className: "day-date",
        text: formatCollectionDate(collectionDate),
      }),
    );
    if (collectionEntry.note) {
      dateHeader.appendChild(
        buildSpan({ className: "day-note", text: collectionEntry.note }),
      );
    }
    dateHeader.appendChild(buildWheelieBin(binsForDay[0].key));
    dayContainer.appendChild(dateHeader);

    const binsContainer = document.createElement("div");
    binsContainer.className = "bins-for-day";

    for (const binType of binsForDay) {
      addBinToContainer({
        container: binsContainer,
        name: binType.name,
        className: binType.className,
      });
    }

    dayContainer.appendChild(binsContainer);
    return dayContainer;
  }

  function addBinToContainer({ container, name, className }) {
    const binDiv = document.createElement("div");
    binDiv.className = `bin ${className}`;

    binDiv.appendChild(buildSpan({ className: "bin-label", text: name }));

    // Haptic feedback on tap (mobile)
    binDiv.addEventListener("click", () => {
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    });

    container.appendChild(binDiv);
  }
});
