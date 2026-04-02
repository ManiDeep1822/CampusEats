---
description: How to handle order cancellations and process refunds manually.
---

# Cancellation and Refund Workflow

Follow these steps to process cancellations and refunds for CampusEats orders.

## 1. Cancellation Request
- **Scenario**: A user requests a cancellation via the AI Assistant or Student Support.
- **Check**: Verify if the order has been "Accepted" by the vendor.
    - If **Pending**: Cancel the order in the database and trigger an automated full refund.
    - If **Accepted/Preparing**: Inform the user that cancellation is no longer possible as per the [Refund Policy](/refund-policy).

## 2. Order Cancellation (System Side)
- Use the Admin Dashboard to locate the Order ID.
- Update the order status to `cancelled`.
- Add a internal note: "User requested cancellation - [Reason]".

## 3. Refund Initiation
- Navigate to the Payment Gateway (e.g., Stripe/Razorpay) dashboard.
- Search for the transaction ID associated with the order.
- Select "Refund" and choose the refund amount (Full or Partial).
- Note: Inform the user it may take 3-7 business days to reflect in their account.

## 4. User Notification
- Ensure the user receives a push notification confirming the cancellation and refund status.
- If necessary, follow up via the internal messaging system.
