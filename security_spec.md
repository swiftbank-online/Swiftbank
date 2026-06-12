# Swift Bank - Security & Threat Modeling Specification (ABAC Framework)

This document contains the core data invariants, malicious payloads, and rules for validating transaction integrity in the system.

## 1. High-Value Data Invariants & Access Control Roles

1. **User Profile Lockdown**: A user is only permitted to read and write their own profile information (`isOwner`). They cannot mutate their balance, transaction history, or `isAdmin` flag directly.
2. **Transaction Immutability**: All transaction records must be locked upon submission. Only admins can update the status of `pending` payments to `approved` or `rejected`.
3. **Double Ledger Ledger Guard (Local Transfers)**: Real local transfers require atomic balances verification on both sides. A transfer cannot result in a negative origin user balance.
4. **Card Isolation**: Only the owner of a card can query its visual properties, copy the number, or flip to reveal the CVV.
5. **Support Ticket Integrity**: A customer is only permitted to read and write context within their own messages, while admins retain broad read/write support privileges.

## 2. The "Dirty Dozen" Malicious Payloads

The following represent core structural vulnerabilities blocked by the Firestore rules setup:

1. **Balance Injection**: A student trying to write `{ "balance": 9999999 }` directly via the web client to standard user collection path.
2. **Self-Promotional Admin**: An unauthenticated user writing `{ "isAdmin": true }` into their document during signup.
3. **Identity Spoofing**: Submitting a transaction with `{ "userId": "another_user_uid" }` to drain funds.
4. **Time Forgery**: Setting future client-side timestamps instead of using standard firestore server time triggers (`request.time`).
5. **Card Hijack**: Reading CVV and PAN numbers for users not matching the authenticated `request.auth.uid`.
6. **State Skip**: Approving one's own card application by modifying `{ "status": "active" }` directly on their level card.
7. **Billion-Byte ID Injection**: Sending massive alphanumeric garbage as an ID (prevented via `.size() <= 128` regex constraints).
8. **Negative Deposit**: Executing top-up requests with `{ "amount": -1000 }` to trigger math errors.
9. **Blanket Query Scraping**: Running empty filters to harvest user details (prevented by checking `resource.data.userId == request.auth.uid` on lists).
10. **P2P Account Spoofing**: Modifying someone else's account number to intercept fund transfers.
11. **Chat Interception**: Injecting message payloads into the `/messages` collection with a spoofed user display name.
12. **System Configurations Override**: Writing to `/settings/global` to change the destination phone, email, and FAQ text.

---

This spec establishes the Zero-Trust constraints applied directly in our production-level firestore Rules.
