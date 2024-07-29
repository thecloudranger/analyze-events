chrome.action.onClicked.addListener((tab) => {
  chrome.scripting
    .executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    })
    .then(() => {
      console.log("Content script injected successfully");
    })
    .catch((err) => {
      console.error("Error injecting content script:", err);
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzeLinks") {
    console.log("Received links to analyze:", request.links);
    analyzeLinks(request.links, sender.tab.id);
  }
});

async function analyzeLinks(links, originalTabId) {
  console.log("Starting link analysis");
  let results = [];
  for (let link of links) {
    console.log("Analyzing link:", link.url);
    try {
      let tab = await chrome.tabs.create({ url: link.url, active: false });
      console.log("Created new tab with ID:", tab.id);

      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for page load

      let [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractPageInfo,
      });

      // console.log("Extracted info from tab:", result.result);

      results.push({
        originalLink: link,
        extractedInfo: result.result,
      });

      await chrome.tabs.remove(tab.id);
      console.log("Closed tab:", tab.id);
    } catch (error) {
      console.error("Error analyzing link:", link.url, error);
    }
  }

  console.log("Analysis complete, sending results back");
  chrome.tabs.sendMessage(originalTabId, {
    action: "analysisComplete",
    results: results,
  });
}

function extractPageInfo() {
  function extractText(element) {
    if (!element) return "Event details not found";
    return element.innerText.trim();
  }

  function extractAttendees() {
    const attendeesElement = document.querySelector("#attendees .text-xl");
    if (attendeesElement) {
      const attendeesText = attendeesElement.textContent;
      console.log("Attendees text:", attendeesText);
      const match = attendeesText.match(/\((\d+)\)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return "Not found";
  }

  const eventDetailsElement = document.querySelector(
    "#event-details .break-words"
  );
  const extractedText = extractText(eventDetailsElement);
  // const attendeesCount = extractAttendees();

  return {
    title: document.title,
    description:
      document.querySelector('meta[name="description"]')?.content ||
      "No meta description found",
    h1: document.querySelector("h1")?.textContent || "No H1 found",
    eventDetails: extractedText,
    url: window.location.href,
    // numberOfAttendees: attendeesCount,
  };
}
