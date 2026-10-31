# Scope
This is the follow up on the upgrade-prep.md which was done and executed but there were some items that were misinterpreted and are not done well. So now with this file we are going to address those issues.

# 1 Delete reservation from the reservation table
- When you click on the ReservationActionsMenu it is working as expected but when the delete option is active and enabled it is not doing what is suppose to do and it needs to be fixed.
- At the moment when you click on delete you are getting redirected to the reservations/:id page which is false.
- What is expected is when you click on the delete option in the ReservationActionsMenu the delete flow should happen there locally just as it is happening on the reservations/:id page when you click the delete button. So you need to use ConfirmButton locally in the ReservationActionsMenu.
- confirming the delete should delete this reservation and refetch the data for the table

# 2 Delete button on reservation page
- At the moment Delete button in the ReservationActionsBar has the tooltip which is false, delete button is self explanatory and it shouldn't use the tooltip, so remove it.
- confirming the delete should delete this reservation and navigate the user to the apartment page and refetch the data for the table

# 3 ReservationActionsBar tooltip now visible
- At the moment tooltips on the ReservationActionsBar buttons is not visible and it is making the wrapper component introduce the scroll, this is not good. We need this tooltips to open and cover what ever is around them and not to be only confined with the wrapper that they are in. So probably some style config needs to be done on the ReservationActionsBar wrapper so these tooltips should be visible.

# 4 Copy guest message should have a tooltip
- At the moment copy guest message button in the reservations/:id page doesn't have a tooltip but it should have it. Tooltip placement on all the buttons on this page should be on the right of the button but on top, and the distance between the button and the tooltip should be a lot smaller then between the button and the next button or the tooltip and the next button on the right.

# 5 Checkout photo proofs button
- In the reservations/:id page in the Proofs section, the checkout photo proofs button should be always enabled if there are photos for this reservation, or let's say if this reservation is covered this button should be enabled.

# 6 Enabling of the create inspection link
- In the reservations/:id page in ReservationActionsBar the create inspection link button should be enabled only if this link doesn't exist and the reservation status is covered and the check in date time is in the future. in all other situations this link should be disabled. And this should be in a way be stated in this button tooltip

# 7 ReservationActionsBar stability
- As a rule we have no hide and show but make things enabled or disabled. So the copy guest message button should be present but disabled if there isn't any inspection link yet and the reservation status is not covered. And always keep in mind that all these buttons in ReservationActionsBar should be disabled if the current date time is more then check in date time, or if there is alternative check in date time then it would be taken in the consideration and not the check in date time.

# 8 Edit alternative check in and checkout
- So right now user can change the current check in or out to any date and time in the future when editing alternatives. This should be restricted. People can be late but not more than 8h, so when someone is editing alternatives it shouldn't be able to add new date time that is more than 8h more then the regular check in or check out. and the values in the date input should also permit this as well.