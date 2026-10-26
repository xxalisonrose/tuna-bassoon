# Missions

Missions are guided activities that sit above the ordinary location-based badge
system. An incomplete mission appears in Passport under **Mission**, immediately
after the badge Type and Status controls. Selecting it opens its steps,
instructions, progress, and rewards. Completed missions leave that section and
become permanent badges under the **Mission** badge type.

## Tutorial mission

**Welcome to Lorcal** activates for every signed-in account. New accounts
see its introduction after choosing a username. Accounts created before the
feature see it the next time they open the updated app. Dismissing the
introduction does not remove the mission; it remains in Passport until complete.

The tutorial has three activity-based goals:

1. check in at five different locations;
2. earn any General, Theme, Special Place, or Seasonal badge; and
3. customize and save the user's avatar.

The server calculates these goals from actual visits, badge awards, and the
saved avatar profile. Pressing through mission text cannot complete a goal.
Goals can be finished in any order, and progress updates automatically.
Finishing all three awards the **New Explorer** Mission badge and unlocks the
**New Explorer Shirt** in the avatar wardrobe.

The version-two mission migration replaces progress from the original
read-and-continue prototype. A prototype completion that does not satisfy the
real goals is reopened, and its early test reward is removed until the goals
are complete.

## Rewards

Mission completion is authoritative on the server. A mission can award:

- a permanent badge with the Mission classification;
- one or more avatar items; and
- future reward types without changing visit-based badge rules.

An unearned Mission badge is not shown in the ordinary badge collection. Once
awarded, it appears in Passport and uses the normal badge celebration flow.
Locked wardrobe items remain visible with the mission required to unlock them,
and the avatar save mutation rejects attempts to equip a locked item.

## Artwork

The reward clothing concept sheet supplied by Dan is stored at
`assets/images/avatar/concepts/reward-clothing-concepts.svg`. The tutorial shirt
was extracted and aligned to the existing 1254 × 1254 avatar canvas as
`assets/images/avatar/items/top/avatar-top-new-explorer-tee.png`. The other
concept-sheet pieces remain source material for future fitted rewards.

## Acceptance checks

1. A new or existing account sees the tutorial introduction once.
2. Choosing **View Mission** opens Passport, restores the normal tab bar, and
   scrolls directly to the active tutorial mission.
3. Choosing **Not Now** preserves the incomplete mission in Passport.
4. Passport shows only incomplete missions in the Mission section.
5. Opening a mission shows every step, the current explanation, and rewards.
6. Check-ins, non-Mission badge awards, and an avatar save are the only events
   that can satisfy the three goals.
7. Completing the tutorial removes it from the active Mission section.
8. The New Explorer badge appears under the Mission badge type.
9. The New Explorer Shirt becomes selectable only after completion.
10. The completed badge uses the normal award popup and acknowledgement flow.
11. Existing prototype progress migrates to the Lorcal mission key without
    leaving duplicate mission records or rewards.
