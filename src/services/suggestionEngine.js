const dictionary = {
  "Long Waiting Time": {
    actions: ["Deploy triage desk to pre-screen needs.", "Open priority lane for seniors/PWDs."],
    strategy: ["Analyze peak hours and shift schedules.", "Move common requests to the online portal."]
  },
  "Unprofessional Staff": {
    actions: ["Review specific staff schedule for that day.", "Issue Code of Conduct memo."],
    strategy: ["Mandatory de-escalation training.", "Implement Employee of the Month program."]
  },
  "Dirty Facility": {
    actions: ["Dispatch janitorial team immediately.", "Check restroom supplies (soap/tissue)."],
    strategy: ["Implement hourly sign-off sheets.", "Add more visible trash bins."]
  },
  "Uncategorized Complaint": {
    actions: ["Manually review feedback text.", "Contact resident for specific details."],
    strategy: ["Update AI categories if a new pattern emerges."]
  }
};

export const getSmartSuggestions = (issue) => {
  if (!issue || issue === "None") return null; 
  return dictionary[issue] || dictionary["Uncategorized Complaint"];
};