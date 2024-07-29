(function () {
  // Function to find links with "events" in their text and extract their URLs
  function findEventLinks() {
    const links = document.getElementsByTagName("a");
    const eventLinks = [];

    for (let link of links) {
      const linkText = link.textContent.toLowerCase();
      const href = link.getAttribute("href");
      const absoluteUrl = new URL(href, window.location.origin).href;
      if (absoluteUrl.includes("events") && /\d/.test(absoluteUrl)) {
        eventLinks.push({
          text: linkText,
          url: absoluteUrl,
        });
      }
    }

    return eventLinks;
  }

  // Function to convert eventLinks to CSV and trigger download
  function downloadCSV(data) {
    const pageTitle = data[0]["Page Title"].replace(/[^a-zA-Z0-9]/g, "_");
    const csvContent = [
      Object.keys(data[0]),
      ...data.map((item) =>
        Object.values(item).map((value) =>
          typeof value === "string"
            ? `"${value.replace(/"/g, '""')}"`
            : `"${value}"`
        )
      ),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${pageTitle}_event_links_analysis.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  console.log("Content script started");
  const eventLinks = findEventLinks();

  if (eventLinks.length > 0) {
    console.log("Found event links:", eventLinks);
    console.log("Sending links for analysis...");
    chrome.runtime.sendMessage({ action: "analyzeLinks", links: eventLinks });
  } else {
    console.log("No event links found on this page.");
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analysisComplete") {
      console.log("Analysis complete. Results:", request.results);

      if (request.results.length > 0) {
        const csvData = request.results.map((item) => ({
          "Link Text": item.originalLink.text,
          URL: item.originalLink.url,
          "Page Title": item.extractedInfo.title,
          "Meta Description": item.extractedInfo.description,
          H1: item.extractedInfo.h1,
          "Event Details": item.extractedInfo.eventDetails,
          // "Number of Attendees": item.extractedInfo.numberOfAttendees,
        }));

        console.log("Generating CSV...");
        downloadCSV(csvData);
        console.log("CSV download initiated");
      } else {
        console.log("No results to generate CSV");
      }
    }
  });

  console.log("Content script setup complete");
})();
