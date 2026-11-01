# Scope
This refactor needs to introduce additional features in the InspectionGuidePage and components that are nested inside it. Nothing else should be affected.

# Goal
The main goal is to have a better UX experience for the user that is making the photo proofs. So availability of the data inside a small real estate of the mobile view is a priority here, because this page is meant to be used strictly by photo.

# UX Aspects
1. Photos transparency list. Now, each photo that user has to take is a step. So we can say that this is a a multi step flow where each step is basically the same. Only the instruction (some type of content) in the step changes, but the structure of the steps is the same. What is not the problem is that you are not seeing previous steps or future steps. What I want is to have a little scrollable horizontal list of small photo components, that will represent all of the photos user needs to take. This list should be visible in every step, so it will be always in the view (only not when the user enters his native device camera). This way user can jump back to se the photo that he made earlier, but he will not be able to jump forward, he will just see the blank photo component.
How will this work? You start the guide and you are on the very start, no photos done, you will see a list of blank photo components on the top of the screen, it will be a scrollable list of steps. Basically you will not be able to click on anything in that list, but you will see how many photos are needed. Bellow this list is the main screen that can be exactly the same as we have right now with shotGuide.camera.noPhoto text. So then when I click on the camera and I make the photo, I will be moved to the next step, as it is right now, but on the list I will see the small photo that I have just done, all the rest will still be blank. This is how I will sequentially move forward. Now on this list I will have to see with highlighted border on what step I am now. And also I will be able to click on the list item with the photo that I just did, and it will return me to that same photo, I could see it in bigger frame bellow, like it is right now, and I would have the retake photo button just as I have it now. On this jump to the step that was taken, the current step will still mark where we stopped the sequential moving forward and then we should have a small button that will say go to current step/photo.
Key points of the aspect:
- Horizontal list of little photo components
- Placed on the top of the screen
- Blank photo component
- Highlight of the current/active step, current is the one that needs to be done next
- Only the photo components with the photo, steps that are done are clickable in the list
- Click will move the user back to that step where he will see the photo in the bigger size like it is now, and he can retake this photo or move back to the current step

2. Sequential nature of the flow. So this flow is same steps just different photo uploaded. So you move from the photo 1 to the photo 2, or step 1 to 2 to 3 etc. You are moving in the line. So then what exactly is the sequence? Is it open the camera take the photo, confirm it in your native camera, and then see it in the app one more time before you move on to the next step. I think this should be the case.
Step sequence:
- start the step
- open native camera
- do the photo (this is not the part of the app it is native device)
- confirm it in the native camera (this is not the part of the app it is native device)
- getting back to the app and seeing the photo you confirmed in the main photo component and also in the small component in transparency list from the point 1.
- retake the photo or move to the next step (actions available)
When you are moving out of the sequence, so you are jumping on the step that is not current, back on the step that already has a photo, you need to have action of move to current step and not move to the next step.

3. Last screen before the submit. This screen needs to motivate the user to check all the photos from the Photos transparency list before the submit. This needs to be just text, so information that all the photos are collected and to check it before submitting it. Then on submit everything needs to be the same as ti is right now. What would be good if you can just add some security measure that user can't really change the page and basically cut the process of submitting, it doesn't have to be something extreme, just something light like disable link clicks or back button or stuff like that.

# Technical code part
- I would like to see some very good readability and code structure that would enable any dev to understand very quickly what is going on. So no big components, but smaller parts composed. Like I want to see those small photo components, composed in the bigger component that would be Photos transparency list. Then I want to see a component for the single step in this flow, etc. So very good balance between logical split, split of the responsibility, and the reusability of the components and the code.