# Initial requirements for the reservation page

The reservation page should be present all important data connected to a reservation and all actions host can do with the reservation on a single page.

# access
The way how we are accessing this reservation page is through reservations table in covera\src\components\host\ReservationsSection.tsx by clicking on the whole row. This means that we need to create a component ReservationsTable which will extract this view from ReservationsSection and encapsulate the api call and the table.
New ReservationTable also needs to have a row of actions which will be an icon button (kebab menu/ vertical ellipsis) when a user click on this it will open like a little menu with current options from covera\src\components\host\ReservationActionsCell.tsx.

# link
so clicking on the reservation table row will open a separate page which will be host/reservation/id
this will probably mean that on the covera-hono side I need a new endpoint for this

# content
this page should have a simple layout. we have guest info, then checkin checkout and alternatives, and then we have info about the proofs and some other info about the reservation. All this are basically a small section. Guest, time, proof, other. Guest part is just info, like a little card. Time part has fixed and editable parts, you can edit the alternative dates right before the check in date, after the check in date time you can't edit these alternative dates either. Other part is just data part and it is at least important, so just small info. Proof part is very important it has chip for the proof status, but it also has some actions, like going to a page that is dedicated to taking proofs if the reservation is not covered yet, if it is then seeing the photos from the coverage. These photos I do not want to be loaded with the page load, but there should be some action to it, like a hidden part that when you click to open you will then load the photos. The photos should look the same as they are looking on the covera\src\components\guest\RoomPhotoItem.tsx this component should be reused. And on the top you would have these general actions like delete and get the message for the user which are even now available on the ReservationActionsCell, but here it would have to be presented with a button. And that is the content of the page in general.

# taking proofs
at the moment this is not a page but a flow, to examine this flow look into covera\src\pages\host\IndividualApartment.tsx handleOpenInspectionGuide. the issue is that whole this flow is living in a page where a lot of different things are living. I want to have a separate page for this. inspection-guide for this and the content of this page would be basically the flow so what is now presented in the dialog should be presented in the page. I want to have a clear separation here and possible future ability to grant access rights to this page for someone that is not a host, but this will not be the scope of this task.

# scope
The scope of this task, for which this prep .md is written is: 1 - to create a reservation page and resolve all the linking to it and possible covera-hono additional endpoints, and 2 - extracting the inspection guide flow into a separate page where it can live and provide the same UX as now in the dialog.