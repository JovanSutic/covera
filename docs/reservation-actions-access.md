# Purpose
This file will define the access of some actions/buttons on the /host/apartments/:id/reservations/:id (reservation page) and /host/apartments/:id/reservations/:id/incident (incident page)

# Buttons / actions
1. Manage claim photos on the incident page - photos btn
2. Create guest inspection link on the reservation page - inspection btn
3. Start the claim button on the reservation page - claim btn
4. Create inspection link - cleaner 1 btn

# Access rules
1. Photos btn - this button is used to collect and store the incident related damage or theft photo proofs. So this link can be accessed, and the button enabled only until the next reservation checkin time has started. This follows the rule, you are able to file a claim before the next checkin has started, meaning the new guest is in the apartment where the damage happened. So this button shouldn't be enabled if there is a newer reservation for this apartment that has already started. Also, if the claim has been filed, meaning the guest response window has been clicked. It doesn't matter if this window is passed or it is still running, as soon as the user starts this countdown, adding of the new photo proofs is disabled.

2. Inspection btn - the inspection process is done buy the guest, so this button shouldn't be enabled after reservation check in or alternative check in time is passed with an additional hour for just in case. So if the check in time is at 14h today, then after 15h this link will be disabled. And the link is enabled as soon as the reservation is covered. This button needs to be in the Access links section.

3. Claim btn - so you can't open the damage or theft claim if there is a new guest in the same apartment or if the checkout is past 30 days. So, the claim button is enabled only after 1 hour before the checkout, and until the new reservation checkin time for the same apartment, or last if 30 days pass after the checkout. One warning do not mistake this button for the open claim button, which is enabled as soon as you create the claim, and stays enabled from that time always.

4. Cleaner 1 btn - this button is used to create access for the cleaner to collect the pre reservation state of the apartment, by taking the photos. So this button access needs to take into account if at the date when on that reservation checkin date there is also a reservation for the same apartment for the checkout time. So same apartment, same date but for one reservation it is checkout and for other it is check in. If this is the situation then this button is enabled 1 hour before the checkout of the former reservation until the checkin time of the current reservation the one that will start at that day. There shouldn't be a situation where this access is given to a cleaner after the checkin time. Also it can't be given during the time a different reservation is in place, only if it is 1h before that reservation checkout. Also this button needs to be renamed, the current name is confusing. I need something like grant special photo access. and the explanation needs to be better as well.
 