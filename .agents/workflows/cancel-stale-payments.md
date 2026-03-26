---
description: How to manage and verify the automated payment cancellation job
---

The automated payment cancellation job runs in the background of the CampusEats server to clear stale "pending" transactions.

### How it works
1. The server initializes a cleanup loop every **60 seconds**.
2. It scans for any `Payment` records in `pending` status created more than **5 minutes** ago.
3. It atomically transitions the linked `Order` to `cancelled` status **only if** it is still in `pending_payment` state (prevents race conditions with concurrent payment verification).
4. The `Payment` record is separately marked `cancelled`.
5. Students are notified via Socket.io to prevent them from trying to pay for a dead session.

> **Note**: The 5-minute window is intentional — it accommodates slow bank gateways and 3D-Secure redirects.

### Verification Steps
// turbo
1. Place a test order but **abandon** the Razorpay popup.
2. Wait for approx. 5-6 minutes.
3. Check the "My Orders" dashboard. The order should automatically move to the 'Cancelled' state.

### Troubleshooting
- If orders are not cancelling, check the server logs for "CRON: Stale payment cleanup" entries.
- Ensure the server system time is synchronized.
- Verify that `Socket.io` is connected, as the job relies on it to push updates to the client.
- If an order shows as `cancelled` but `Payment` is still `pending`, the server may have crashed mid-cleanup. Fix: manually update the Payment status in MongoDB.
