# Upgrade aspects
1. Reservation table and action buttons
2. Create reservation
3. Reservation page layout - what is missing, what is misplaced, component style 
4. Reservation page proof section - how are photos displayed and when they are available
5. Components reusability and split

# 1 Reservation Table and Actions
- There should be table header Actions for the column where this button is
- Clicking on the action icon button opens the actions list which is fine but there is an issue of the layout and duplications of the icons. In the ReservationActionsMenu each line/row/menu item is a button, it is not that only the icon is the button with the click effect. each line/row/menu item has the hover effect, but the effect is the same for all the lines, so just highlight the text and the icon in the same way if they are not disabled and show the pointer. if they are disabled just show the no click allowed.
- Create guest inspection link and take proofs shouldn't be in this menu. So only delete and copy message.
- These buttons are presenting the shortcut, so I am not going to the page to do it but I can do it from the place where the table is placed. So, these functionalities should be enabled from the table. There is a pattern that I am using for the delete, look into covera\src\components\host\AssetItemCard.tsx. It would be good if this delete pattern can be somehow extracted into a separate component and reused. But when reusing this component be mindful of the size, this should be the same on the page as well, the same pattern just bigger size. So this let's call it delete button, with this onClick behavior should be highly configurable.

# 2 Create Reservation
- When user is creating reservation, on success of that API call it should be redirected to the new reservation/id page and not stay on the place where the create reservation button was provided. So no sonner snackbar or anything like that, when the reservation is created, user is redirected to that new reservation page.

# 3 Reservation Page Layout
- Back button should look exactly the same as it is on the /host/apartments/:id page. Look at ApartmentOverviewHeader in covera\src\components\host\ApartmentHeader.tsx the back link should be extracted from there and be created as a stand alone component and reused everywhere just with different configuration, different text.
- Look at the ApartmentHeader, something similar in the similar style should be the reservation header as well. There should be guest name and email, check in date time but also the apartment name and the address. host can just share this link and then the user coming there needs to be aware which apartment is this reservation for. So we need ReservationHeader that will look very much like the ApartmentHeader.
- With the changes above we do not really need the guest section. The next section should be the proof, then the time and last other. Before all these sections we should have a part where the general actions are going to be placed. There should be some uniformity about these buttons, so all the buttons on the page should look exactly the same, icon and then text, same color. but on these general icon buttons there should be some info icon near that would trigger some tooltip that will explain what the button does. This is a mobile first app, so pay attention to the space and layout. Also delete button shouldn't have this tooltip.
- Section style in general should be the same as in other pages, so for the inspiration look at the components in covera\src\components\guest


# 4 Reservation Proof section
- The button for taking the proofs should be aligned with all other icon buttons on the page. So there shouldn't be any difference in color size or anything like that. It is a button with an icon and with some size and all the buttons with icons and that size in the app should look the same, but for the scope of this task look only for the buttons on the reservation/id page.
- This button should always be on the page, but show disable mode when it is not ready for the click. Now it is hidden in some situations, I want to avoid the hide show layout issues but I want to have a stable UI. So this button is always in this section but in cases where it is not hidden it should just be disabled.
- When the host finishes the taking photos on inspection/:id and when he is returned back to the reservation/:id page it needs to be able to see the photos right away. So there should be some button in this section that will say something like check out the photo proofs, and it should be stable as well it should be always there, but disabled if there are no photos. When it is enabled and you click on this button, you should open a dialog and then in this dialog you can see all the photos. Why dialog? because it takes the center of the view and then you do not have to think about if the user did catch if something had open on the page and he can see the photos now.
- Apart from being able to see the photos when they are available. Host needs to have some information about how many photos are there and when they are captured, and for that capture of the last one can be taken as the reference. So this proof section should hold the status, button for taking photos and seeing the photos, explanation of the proof status and info about how many photos there are and when the last one was captured.
- Also the reusability of the RoomPhotoItem for displaying photos is ok, but we do not need flag action button, and the review item text. so maybe add a mode as a prop for this component so we can have guest and host versions of it. and guest can be a default value. host is what we will use for displaying photos in the reservation/:id page in the dialog

# 5 Components Reusability 
- Even in the earlier bullets there were points that are covering the reusability of the components and making sure that some patterns are encapsulated. What we need for sure is the button that can be reusable all across the app. So highly configurable with text, icon, color or even better the variant, on click effect, size, loading mode, etc. So something we can have as a rule for buttons.
- Scope for this task is buttons with on the /reservations/:id page
- The delete button is something else cause it has some follow up behavior, but we will need this in one component because it will be reused all across the app.
- we can also have some section reusability I think there are some good examples in the covera\src\components\shared Card maybe. So with all new development we should reuse what we have, so if the section in the /reservation/:id page is going to be the card then use the Card component.
- the back link as well
- for the scope of this task we just need to think about the changes in ReservationTable and its ReservationActionsMenu, component in reservations/:id page, and get them all to be aligned with what we already have in the app.
- this is mobile first app so think about the mobile layout all the time