# User Identity and Access

## Public usernames

Every signed-in account receives a private profile record the next time it
opens the updated app. The record stores the current Clerk display name and
email for account support and Admin search. Email addresses are never returned
to another ordinary user or displayed as part of a public profile.

An account without a username is invited to choose one after sign-in. The
prompt can be postponed, and Settings continues to offer **Choose Username**
until the profile is complete. Existing accounts are handled the same way, so
the change does not require a one-time database migration.

Usernames:

- are unique without regard to capitalization;
- contain 3-20 letters, numbers, underscores, or hyphens;
- begin and end with a letter or number;
- cannot use reserved project or staff terms;
- pass the same project-controlled profanity and slur list used by community
  submissions; and
- can normally be changed once every seven days.

Administrators can change their own username without the cooldown during
development. Server validation remains authoritative for uniqueness, format,
reserved names, content safety, and the cooldown.

## User directory

The Content Portal includes a **Users** section. Administrators can search
registered profiles by public username, display name, or private email. A user
must open the updated app at least once before the profile can appear in this
directory. This avoids importing or duplicating Clerk's account directory and
keeps the app database limited to people who have actually used Lorcal.

Search results show the effective role and how the user received access:
earned progress, a manual grant, Regional Moderator status, or Admin
configuration. Email is visible only in the protected Admin workspace.

Each non-admin user card has one **Manage Account Status** action. It opens a
single status editor containing Explorer (no manual role), Community
Contributor, and Regional Moderator, rather than placing multiple role-changing
buttons directly on every user card.

## Manual roles

An administrator can assign one of two manual roles:

- **Community Contributor** grants access to private location submissions.
- **Regional Moderator** includes Community Contributor submission access and
  reserves the user's place in the future moderation workflow. It does not yet
  grant review or publishing controls.

Removing a manual role does not remove Community Contributor access from a
user who already satisfies the earned requirements. Admin access remains in
secure deployment configuration and cannot be edited in the portal.

Every manual grant, promotion, downgrade, or removal writes an audit entry with
the target user, acting administrator, previous and new role, timestamp, and an
optional reason. The recent history appears beneath the user directory.

The existing environment-variable allowlists remain supported as emergency and
migration overrides, but ordinary role management should now use the portal.

## Acceptance checks

1. A newly opened account is prompted for a username and can postpone the
   choice.
2. Duplicate usernames are rejected even when capitalization differs.
3. Invalid, reserved, and filtered usernames are rejected on the server.
4. Settings displays the saved username and the next allowed change date.
5. Admin search finds a synced user by username, name, or email.
6. Granting Community Contributor immediately unlocks submission access.
7. Regional Moderator receives submission access without Content Portal
   review permissions.
8. Removing a manual grant preserves independently earned access.
9. Every manual role change appears in the audit history.
10. Non-admin accounts cannot call user-directory or role-management
    functions directly.
