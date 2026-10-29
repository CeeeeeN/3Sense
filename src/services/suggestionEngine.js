const dictionary = {
  "Long Waiting Time": {
    statement: "Residents are experiencing excessive delays before receiving assistance or documents.",
    actions: ["Deploy a triage desk to pre-screen needs and check requirements.", "Open a priority lane for seniors, pregnant women, and PWDs."],
    strategy: ["Analyze peak hours to adjust staff shift schedules.", "Migrate standard document requests fully to the online portal."]
  },
  "Unprofessional Staff": {
    statement: "Staff members were reported as rude, inattentive, or unhelpful during interactions.",
    actions: ["Review duty rosters for the reported date/time.", "Issue a reminder memo regarding the public service Code of Conduct."],
    strategy: ["Schedule mandatory customer service and de-escalation training.", "Implement an 'Employee of the Month' recognition program."]
  },
  "Dirty Facility": {
    statement: "Public facilities or restrooms were found unkempt, unsanitary, or lacking basic supplies.",
    actions: ["Dispatch the maintenance/janitorial team for immediate cleanup.", "Restock critical supplies (soap, tissue, alcohol)."],
    strategy: ["Implement visible hourly cleaning sign-off sheets.", "Increase the number of accessible trash bins in high-traffic areas."]
  },
  "Unclear Requirements": {
    statement: "Residents are confused about the prerequisites needed for their requests, leading to rejected applications.",
    actions: ["Print and post step-by-step requirement checklists at the front desk.", "Instruct frontliners to double-check documents before queueing."],
    strategy: ["Update the barangay website and Facebook page with simplified infographics.", "Standardize application forms with built-in checklists."]
  },
  "Broken Equipment": {
    statement: "Barangay equipment (e.g., chairs, covered court lights, sound system) is malfunctioning, missing, or damaged.",
    actions: ["Tag the item as 'Out of Order' to prevent injury.", "Dispatch the barangay technician for immediate assessment."],
    strategy: ["Establish a routine monthly preventive maintenance schedule.", "Allocate budget for upgrading outdated or frequently broken inventory."]
  },
  "Poor Crowd Control": {
    statement: "Events or service areas are overcrowded, leading to disorganized lines and potential safety concerns.",
    actions: ["Deploy Barangay Tanods to manage lines and enforce order.", "Set up physical stanchions, chairs, or barriers to guide foot traffic."],
    strategy: ["Implement an online appointment system to stagger resident arrivals.", "Relocate large payout or relief events to the main covered court."]
  },
  "Unresponsive Hotline": {
    statement: "Residents reported that emergency or inquiry calls to the barangay desk were unanswered.",
    actions: ["Verify if the physical phone lines or mobile units are functioning.", "Assign a dedicated communication officer for the current shift."],
    strategy: ["Setup an automated SMS auto-reply acknowledging receipt of messages.", "Implement a multi-line PBX system or official barangay chatbot."]
  },
  "Noise Disturbance": {
    statement: "Complaints regarding loud music, videoke, or disruptive gatherings in neighborhoods.",
    actions: ["Dispatch a Tanod patrol to issue a verbal warning to the location.", "Log the incident for potential repeat-offender tracking."],
    strategy: ["Strictly enforce the barangay noise curfew ordinance.", "Launch a community awareness campaign regarding neighborhood etiquette."]
  },
  "Program Delays": {
    statement: "A scheduled barangay program or seminar started much later than the advertised time.",
    actions: ["Issue an apology announcement to the waiting attendees.", "Provide updates regarding the new estimated start time."],
    strategy: ["Require organizers to complete setup 1 hour prior to events.", "Avoid scheduling back-to-back programs without a buffer period."]
  },
  "Uncategorized Complaint": {
    statement: "An unusual or highly specific issue was reported that requires manual review.",
    actions: ["Manually review the feedback text to understand the exact context.", "Contact the resident directly for clarification and specific details."],
    strategy: ["Monitor this issue to see if a new pattern emerges.", "Update the AI dictionary categories if this becomes a recurring problem."]
  },
  "System Glitches": {
    statement: "Residents are experiencing technical errors, crashes, or slow loading times when using the barangay online portal.",
    actions: ["Report the specific error to the IT development team immediately.", "Post an advisory on the Facebook page acknowledging the system downtime."],
    strategy: ["Conduct regular server maintenance and stress tests during low-traffic hours.", "Implement an in-app 'Report a Bug' button for faster technical feedback."]
  },
  "Incorrect Document Details": {
    statement: "Issued clearances or certificates contain typos, wrong dates, or incorrect resident information.",
    actions: ["Reprint and replace the affected document immediately free of charge.", "Double-check the data entry against the resident's submitted ID."],
    strategy: ["Implement a 'Review Before Print' step where residents verify their details on a tablet/screen.", "Upgrade the database to auto-fill verified resident profiles to prevent manual typos."]
  },
  "Favoritism / Palakasan": {
    statement: "Residents feel that certain individuals are bypassing queues or receiving preferential treatment from staff.",
    actions: ["Reiterate the strict 'First Come, First Served' policy to all front desk staff.", "Investigate specific claims using CCTV or queuing logbook records."],
    strategy: ["Implement a strict, randomized digital queue number system for high-demand services.", "Standardize relief distribution using pre-verified household IDs or QR codes."]
  },
  "Lack of Medicines/Supplies": {
    statement: "The barangay health center or desk has run out of essential medicines, vitamins, or first-aid supplies.",
    actions: ["Procure emergency over-the-counter stock from the barangay petty cash fund.", "Direct residents to the nearest alternative city health center or hospital."],
    strategy: ["Establish an automated inventory alert system for low-stock items in the dashboard.", "Increase the quarterly budget allocation for high-demand medical supplies."]
  },
  "Uncollected Garbage": {
    statement: "Trash is accumulating in designated pickup areas due to delayed or missed collection schedules.",
    actions: ["Coordinate with the city sanitation department for an emergency dispatch.", "Deploy barangay eco-aides to clear immediate hazards blocking roads."],
    strategy: ["Publish the official garbage collection schedule consistently on all barangay channels.", "Enforce local ordinances against illegal dumping using CCTV monitoring."]
  },
  "Stray Animals": {
    statement: "Roaming dogs or cats are causing safety concerns, scattered trash, or noise in the neighborhoods.",
    actions: ["Dispatch tanods to secure the immediate area if an animal is reported as aggressive.", "Contact the City Veterinary Office for safe impounding assistance."],
    strategy: ["Organize a barangay-wide free anti-rabies vaccination and spay/neuter drive.", "Strictly enforce the 'Responsible Pet Ownership' ordinance with corresponding penalties."]
  },
  "Clogged Drainage / Flooding": {
    statement: "Streets or pathways are experiencing localized flooding due to blocked drainage systems.",
    actions: ["Deploy the barangay maintenance crew to clear surface debris from grates.", "Set up warning signs or barriers around deep or hazardous flooded areas."],
    strategy: ["Schedule routine declogging operations before the rainy season begins.", "Launch a community education campaign on proper waste disposal to prevent clogs."]
  },
  "Curfew Violations": {
    statement: "Minors or groups are reported loitering in public areas past the barangay curfew hours.",
    actions: ["Dispatch the barangay patrol to safely escort minors back to their homes.", "Log the incident and summon the parents/guardians to the barangay hall."],
    strategy: ["Increase tanod visibility and roving patrols in known hotspots during late-night hours.", "Organize youth sports or productivity programs to keep minors engaged during the day."]
  },
  "Poor Lighting / Dark Streets": {
    statement: "Streetlights are busted or missing in certain areas, increasing safety risks at night.",
    actions: ["Send a team to inspect the reported area and replace busted bulbs if possible.", "Increase tanod foot patrols in the affected dark areas temporarily."],
    strategy: ["Map out all busted streetlights and submit a bulk repair request to Meralco/City Engineering.", "Allocate budget for solar-powered LED streetlights for off-grid alleys."]
  },
  "Missing Documents": {
    statement: "Submitted requirements, IDs, or processed certificates were misplaced, lost, or unaccounted for by the staff.",
    actions: ["Conduct an immediate physical search of the receiving area and back office.", "Re-process the resident's request immediately without requiring them to queue again."],
    strategy: ["Implement a strict physical-to-digital logging system for all incoming papers.", "Provide residents with trackable receiving stubs or reference numbers for all submissions."]
  },
  "Signatory Unavailable": {
    statement: "Release of documents was delayed because the Punong Barangay or authorized signatory was not present.",
    actions: ["Inform the resident of the exact time the signatory will return to the hall.", "Offer to deliver the document or notify them via SMS the moment it is signed."],
    strategy: ["Authorize a designated OIC (Officer-in-Charge) or alternate signatory for standard clearances.", "Adopt secure digital signatures for standard, low-risk barangay certificates."]
  },
  "Slow Processing Time": {
    statement: "The actual encoding, printing, or approval of requests is taking significantly longer than the standard timeframe.",
    actions: ["Assign an additional clerk to help clear the current backlog of pending documents.", "Check if the delay is caused by a hardware issue (e.g., paper jam, slow internet)."],
    strategy: ["Upgrade office hardware (printers, computers) to handle high-volume processing.", "Pre-print standard certificate templates to minimize manual typing time."]
  },
  "Inconsistent Information": {
    statement: "Residents were given conflicting instructions by different staff members regarding requirements or procedures.",
    actions: ["Have a supervisor step in to clarify the correct procedure for the affected resident.", "Hold a quick 5-minute alignment huddle with the current shift staff."],
    strategy: ["Create a standardized, printed 'Cheat Sheet' of requirements for all front desk staff.", "Conduct weekly briefings to ensure all shifts are updated on new barangay policies."]
  },
  "Data Privacy Concerns": {
    statement: "Personal documents, IDs, or contact information were left exposed on desks or handled carelessly in public view.",
    actions: ["Immediately secure the exposed documents into a restricted folder or filing cabinet.", "Issue a verbal reminder to the current shift regarding confidentiality."],
    strategy: ["Enforce a strict 'Clean Desk Policy' where no resident data is left unattended.", "Conduct a Data Privacy Act (DPA) refresher seminar for all frontliners and clerks."]
  },
  "Payment / Fee Confusion": {
    statement: "Residents expressed confusion, frustration, or suspicion over unexpected fees or unclear payment structures.",
    actions: ["Explain the exact fee breakdown clearly and issue an official receipt immediately.", "Ensure the cashier has enough loose change (barya) to prevent payment delays."],
    strategy: ["Post a highly visible 'Citizen's Charter' tarpaulin listing all exact document fees.", "Integrate transparent digital payment options (GCash/Maya) directly into the portal."]
  },
  "Unapproachable Security / Guards": {
    statement: "The barangay tanods, guards, or frontline greeters were perceived as intimidating, dismissive, or rude.",
    actions: ["Speak with the assigned guard to ensure they are guiding residents properly.", "Temporarily assign a dedicated public assistance officer to the main entrance."],
    strategy: ["Include security personnel in mandatory customer service and hospitality training.", "Establish a clear 'First Point of Contact' protocol for greeting walk-in residents."]
  },
  "System Offline / Downtime": {
    statement: "The local barangay system, internet connection, or printer went offline, halting all digital processing.",
    actions: ["Switch to the manual logbook fallback system to continue receiving requests.", "Inform waiting residents of the estimated time until the system is restored."],
    strategy: ["Invest in a backup internet connection (e.g., prepaid pocket WiFi) and a UPS for the main server.", "Ensure the manual fallback procedure is officially documented and practiced."]
  }
};

export const getSmartSuggestions = (issue) => {
  if (!issue || issue === "None") return null; 
  
  // Try to find an exact match, otherwise fall back to Uncategorized
  const found = dictionary[issue] || dictionary["Uncategorized Complaint"];
  
  return {
    issueName: issue,
    // Provide a clear summary statement of what the issue actually means
    statement: found.statement || `Multiple residents have submitted negative feedback regarding: ${issue}.`,
    actions: found.actions,
    strategy: found.strategy
  };
};