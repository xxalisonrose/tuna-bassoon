# Lorcoin Economy

Lorcoins give exploration rewards a practical use without charging for the
starter avatar. The first beta economy uses three simple values:

- Each first check-in at a location earns 5 Lorcoins.
- Each badge award or badge level earns 50 Lorcoins.
- Each standard paid wardrobe item costs 100 Lorcoins.

Visits and badge awards are already unique saved records, so the balance is
derived from those records and cannot be increased by repeating the same
check-in or re-running badge synchronization. Wardrobe purchases are stored
separately with the price paid. This also gives existing testers credit for
their earlier visits and badges without a migration.

The Trail Basics and Traditional Explorer pieces remain free. The New Explorer
Shirt remains a mission reward. Cozy Winter, Cowboy, and Princess pieces are
the first purchasable items. Any paid item that was already saved before the
economy launched is grandfathered at no cost.

Complete Looks do not sell bundles. A player can equip one after owning every
paid piece included in that look. This keeps individual customization at the
center of the wardrobe while preserving complete costumes as a convenience
and future special reward format.

Selecting an unowned item previews it without spending anything. The player
must then choose Buy and accept a separate confirmation before the purchase is
recorded. When the balance is too low, the wardrobe shows how many more
Lorcoins are needed and does not send a purchase request.

## Balance rules

The current balance is:

`(unique visits × 5) + (badge awards × 50) - wardrobe spending`

Administrative progress reset removes test wardrobe purchases and restores the
free Traditional Explorer look so a beta tester can replay the economy from
zero. Production tools should not erase purchases unless that behavior is
explicitly requested.

## Future tuning

The three values are constants and can be tuned after observing beta behavior.
Before changing them, review how many locations a typical tester can reach,
how quickly badge levels are earned, and how long one item should take to buy.
Limited costumes, streak bonuses, or other reward sources should use the same
wallet and remain idempotent.
