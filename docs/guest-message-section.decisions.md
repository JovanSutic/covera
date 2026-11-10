# Guest message section — decisions

Every row is approved. The executor makes no choices.

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D1 | Extract the shared section as `src/components/shared/CopyMessageSection.tsx`. | The host asked for the parts shared by the reservation and incident pages; `shared` is where `SectionCard` and `ActionButton` already live. | approved |
| D2 | The reservation page renders the section **only when `reservation.inspection?.id` exists**; no link, no section. | The host's decision: the section appears when the guest inspection link exists. | approved |
| D3 | The reservation page's section title is `reservationPage.guestMessage.title` = "Guest message"; the hint is `reservationPage.guestMessage.hint`. | "Request text" is the Airbnb request's term; the guest message is a host→guest message. The hint is the "where and how" copy the host asked for. | approved |
| D4 | Reuse `guestInspectionMessage.copyButton`, `.toastCopySuccess` and `.toastCopyError` for the reservation page's copy control and toasts. | They already exist in all four locales and describe exactly this message. | approved |
| D5 | Remove the copy button and its popover from `ReservationActionsBar`. | The host's decision: the section replaces the button + popup. The table's kebab popover stays (also the host's decision). | approved |
| D6 | Place the section **after `ReservationProofSection` and before `ReservationIncidentSection`**. | The message follows the proof/guest-inspection step in the page's reading order and stays next to the proof controls it depends on. | approved |
| D7 | The incident page's `ClaimFilingPanel` renders the same `CopyMessageSection`; its title stays `incidentPage.filing.message.title`, its copy label stays `incidentPage.filing.message.copy`, its toasts stay `incidentPage.filing.toasts.copied` / `.copyError`, and its Resolution Center link stays in the component's optional `action` prop. | The host asked for the incident text to stay unchanged while sharing the pattern. | approved |
| D8 | The shared component's copy handler owns `navigator.clipboard.writeText`, `toast.success(copySuccess)` and `toast.error(copyError)`; no error state is rendered in the section. | Same behaviour as the incident page today; the toast is the feedback. | approved |
| D9 | The section's textarea defaults to `rows={10}`; the reservation page passes `rows={6}` because its message is shorter. | The incident's item list needs the taller box; the guest message is a short paragraph. | approved |
| D10 | No new API, route or query key. | The section only reads `reservation.inspection.id` and the existing locale template. | approved |
| D11 | Tests: a component test for `CopyMessageSection` (copy, hint, action link, clipboard failure) and a page test in `ReservationPage.test.tsx` for the new section's visibility and copy. The incident page's existing tests must stay green. | The copy handler is testable logic; the page test proves the section is wired. | approved |
| D12 | All four locales (`en`, `de`, `tr`, `sr-Latn`) get the two new keys in `host.json`; no key is added to `en` alone. | Invariant 2 and the locale-parity check. | approved |
| D13 | The table's kebab menu's copy popover and `GuestInspectionMessage` are untouched. | The host's decision to leave the table alone. | approved |
| D14 | The section's hint is a plain paragraph below the textarea and above the copy control. | The host's "bellow the text there can be a message where and how to do it". | approved |
| D15 | The section's copy control uses `variant="info"` and the `Copy` icon, matching the incident page's current copy control. | Keeps the incident page visually unchanged. | approved |
