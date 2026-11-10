# Frontend System Interface Specs & Interactive Flows
## Context & System Goals
This document provides UI component rules and view states required to construct the interface for both the Desktop Office Administrative Dashboard and the Mobile Field Operations Portal.

## 1. Views & Component Requirements

### View A: Host Reservation Page (The Administrative Command Center)
*   **The Incident Sub-Hub Widget:** Displays current incident statuses using color-coded badges (`Draft` = Gray, `Ready to File` = Yellow, `Submitted to Guest` = Blue).
*   **Dynamic Banner System:** If `is_emergency_mode == true`, apply a sticky flashing red top banner reading: `⚠️ EMERGENCY FILING SPEED REQUIRED: Incoming profile check-in occurs in under 4 hours.`
*   **Line-Item Generator Controls:** Features a reactive multi-select list allowing hosts to instantly allocate new asset rows (e.g., Bedroom Curtains, Living Room TV) to the active claim folder.

### View B: Cleaner Field Portal (Tokenized Mobile Responsive Interface)
*   **Zero-Authentication Security Bounds:** Completely isolated views lacking navigation panels or user search elements. Only displays the targeted asset's immediate requirements.
*   **Ghost-Overlay Camera Component:** Invokes device-native video stream windows inside the mobile browser. Implements a responsive canvas component with `opacity: 0.4` mapping the matching prior-stay turnover asset image directly over the active viewfinder grid.
*   **Validation Block Screen:** Locks user input immediately after files are posted, showing an isolated text window: `✔️ Report Successfully Syncing. Safe to lock and exit turnover.`

### View C: The Copy-Paste Hub Screen (The Integration Bypass)
*   **Aggregate Figures Module:** Calculates total placeholder expenses cleanly.
*   **One-Click Copy Text Blocks:** Exposes simple clipboard action loops formatting multi-asset complaints natively for the Airbnb resolution text box.
*   **Dynamic Deep Link Routing:** A primary CTA action loop routing users to the specific external Airbnb Resolution interface.

## 2. Interactive Flow Mapping & State Logic Matrix

| Operational Phase | Master UI State Trigger | Host Desktop Interface View | Cleaner Mobile Portal State |
| :--- | :--- | :--- | :--- |
| **1. Triage Creation** | `Incident: 'draft'` | Renders the primary `Add Asset` panel. Outputs a localized text string copy loop for the active `cleaner_token`. | Link is generated but waiting for physical activation. |
| **2. Field Intake** | `IncidentItems: 'link_generated'` | Displays a sticky waiting indicator: `⏳ Field Team Completing Room Scan...` | Portal opens to the designated item card. Forces wide and macro view capture sequences. |
| **3. Aggregation** | `Incident: 'ready_to_file'` | Switches dashboard to **The Copy-Paste Hub Screen**. Displays compiled zip down links and text generation boxes. | Link transitions to an expired lock state to prevent secondary uploads. |
| **4. Time Enforcement** | `Incident: 'submitted_to_guest'` | Disables copy boxes. Activates an ongoing **24-hour visual countdown clock** linked to the deadline metadata. | Access Denied Screen. |
| **5. Post-Claim Compliance** | `Incident: 'escalated_to_aircover'` | Unlocks the extended **30-Day Document Upload Vault**. Renders a step-by-step required compliance upload matrix. | Access Denied Screen. |
