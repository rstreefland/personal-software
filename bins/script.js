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

  const schedule = [
    { date: "2024-12-04", food: true, green: true, blue: false, black: false },
    { date: "2024-12-11", food: true, green: false, blue: true, black: true },
    { date: "2024-12-18", food: true, green: true, blue: false, black: false },
    {
      date: "2024-12-27",
      food: true,
      green: false,
      blue: true,
      black: true,
      note: "Christmas revised day",
    },
    {
      date: "2025-01-03",
      food: true,
      green: true,
      blue: false,
      black: false,
      note: "New Year revised day",
    },
    {
      date: "2025-01-09",
      food: true,
      green: false,
      blue: true,
      black: true,
      note: "Revised day",
    },
    { date: "2025-01-15", food: true, green: true, blue: false, black: false },
    { date: "2025-01-22", food: true, green: false, blue: true, black: true },
    { date: "2025-01-29", food: true, green: true, blue: false, black: false },
    { date: "2025-02-05", food: true, green: false, blue: true, black: true },
    { date: "2025-02-12", food: true, green: true, blue: false, black: false },
    { date: "2025-02-19", food: true, green: false, blue: true, black: true },
    { date: "2025-02-26", food: true, green: true, blue: false, black: false },
    { date: "2025-03-05", food: true, green: false, blue: true, black: true },
    { date: "2025-03-12", food: true, green: true, blue: false, black: false },
    { date: "2025-03-19", food: true, green: false, blue: true, black: true },
    { date: "2025-03-26", food: true, green: true, blue: false, black: false },
    { date: "2025-04-02", food: true, green: false, blue: true, black: true },
    { date: "2025-04-09", food: true, green: true, blue: false, black: false },
    { date: "2025-04-16", food: true, green: false, blue: true, black: true },
    { date: "2025-04-23", food: true, green: true, blue: false, black: false },
    { date: "2025-04-30", food: true, green: false, blue: true, black: true },
    { date: "2025-05-07", food: true, green: true, blue: false, black: false },
    { date: "2025-05-14", food: true, green: false, blue: true, black: true },
    { date: "2025-05-21", food: true, green: true, blue: false, black: false },
    { date: "2025-05-28", food: true, green: false, blue: true, black: true },
    { date: "2025-06-04", food: true, green: true, blue: false, black: false },
    { date: "2025-06-11", food: true, green: false, blue: true, black: true },
    { date: "2025-06-18", food: true, green: true, blue: false, black: false },
    { date: "2025-06-25", food: true, green: false, blue: true, black: true },
    { date: "2025-07-02", food: true, green: true, blue: false, black: false },
    { date: "2025-07-09", food: true, green: false, blue: true, black: true },
    { date: "2025-07-16", food: true, green: true, blue: false, black: false },
    { date: "2025-07-23", food: true, green: false, blue: true, black: true },
    { date: "2025-07-30", food: true, green: true, blue: false, black: false },
    { date: "2025-08-06", food: true, green: false, blue: true, black: true },
    { date: "2025-08-13", food: true, green: true, blue: false, black: false },
    { date: "2025-08-20", food: true, green: false, blue: true, black: true },
    { date: "2025-08-27", food: true, green: true, blue: false, black: false },
    { date: "2025-09-03", food: true, green: false, blue: true, black: true },
    { date: "2025-09-10", food: true, green: true, blue: false, black: false },
    { date: "2025-09-17", food: true, green: false, blue: true, black: true },
    { date: "2025-09-24", food: true, green: true, blue: false, black: false },
    { date: "2025-10-01", food: true, green: false, blue: true, black: true },
    { date: "2025-10-08", food: true, green: true, blue: false, black: false },
    { date: "2025-10-15", food: true, green: false, blue: true, black: true },
    { date: "2025-10-22", food: true, green: true, blue: false, black: false },
    { date: "2025-10-29", food: true, green: false, blue: true, black: true },
    { date: "2025-11-05", food: true, green: true, blue: false, black: false },
    { date: "2025-11-12", food: true, green: false, blue: true, black: true },
    { date: "2025-11-19", food: true, green: true, blue: false, black: false },
    { date: "2025-11-26", food: true, green: false, blue: true, black: true },
  ];

  const currentDateDisplay = document.getElementById("current-date-display");
  const nextCollectionDateDisplay = document.getElementById(
    "next-collection-date-display",
  );
  const collectionNoteDisplay = document.getElementById("collection-note");
  const binsToPutOutContainer = document.getElementById("bins-to-put-out");
  const updateMessageSection = document.getElementById("update-message");
  const collectionInfoSection = document.getElementById("collection-info");

  const today = new Date();
  // For testing:
  // const today = new Date("2025-11-26T00:00:00Z"); // Day of last collection
  // const today = new Date("2025-11-28T12:00:00Z"); // Day after last collection

  currentDateDisplay.textContent = `Today: ${today.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;

  const todayNormalized = new Date(today);
  todayNormalized.setHours(0, 0, 0, 0);

  let foundCollection = false;

  function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  }

  for (const collectionEntry of schedule) {
    const collectionDate = new Date(collectionEntry.date);
    collectionDate.setHours(0, 0, 0, 0);

    // We are looking for the next collection *on or after* today
    if (todayNormalized.getTime() <= collectionDate.getTime()) {
      const day = collectionDate.getDate();
      const weekday = collectionDate.toLocaleDateString("en-GB", { weekday: "long" });
      const ordinalSuffix = getOrdinalSuffix(day);

      let displayString = `Next collection on ${weekday} ${day}${ordinalSuffix}`;
      if (collectionEntry.note) {
        displayString += ` (${collectionEntry.note})`;
      }
      nextCollectionDateDisplay.textContent = displayString;
      collectionNoteDisplay.style.display = "none";

      binsToPutOutContainer.innerHTML = "";

      if (collectionEntry.black) {
        addBinElement("General Waste", "black-bin");
      }
      if (collectionEntry.blue) {
        addBinElement("Recycling (Paper & Card)", "blue-bin");
      }
      if (collectionEntry.green) {
        addBinElement(
          "Recycling (Plastics, Glass, Cans & Cartons)",
          "green-bin",
        );
      }
      if (collectionEntry.food) {
        addBinElement("Food Waste", "food-bin");
      }
      foundCollection = true;
      break;
    }
  }

  if (!foundCollection) {
    collectionInfoSection.style.display = "none";
    const updateMessageParagraph = updateMessageSection.querySelector("p");
    if (updateMessageParagraph) {
      updateMessageParagraph.textContent =
        "New bin collection schedule needed. Rhys, please update the app!";
    }
    updateMessageSection.style.display = "block";
  }

  function addBinElement(name, className) {
    const binDiv = document.createElement("div");
    binDiv.className = `bin ${className}`;
    binDiv.textContent = name;
    binsToPutOutContainer.appendChild(binDiv);
  }
});
