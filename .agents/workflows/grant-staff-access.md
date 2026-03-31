---
description: How to Grant Access to New Vendors and Riders
---

This workflow describes the process for administrators to securely onboard new staff (Vendors and Delivery Personnel/Riders) to the CampusEats platform.

### Step 1: Admin Creation
1. Log in to the **Admin Dashboard**.
2. Navigate to either **"Manage Vendors"** or **"Manage Riders"**.
3. Click the **"Add Vendor"** or **"Add Rider"** button.
4. Fill in the required details (Name, Email, Phone, and Temporary Password).
5. Click **"Grant Access"**.

### Step 2: Automated Invitation & OTP Delivery
// turbo
1. The server will automatically:
   - Create the internal user account.
   - Generate a secure 6-digit **Registration OTP**.
   - Dispatch a premium **Invitation Email** via the Brevo API to the user's email address.
   - Show a "Verify & Approve" modal on the admin interface.

### Step 3: Verification & Approval
1. The new vendor/rider receives the invitation email.
2. They provide the 6-digit code to the administrator (or verify themselves via the platform).
3. The admin enters the code into the verification modal.
4. Upon successful verification, the account is marked as `isVerified` and the profile is activated.

### Troubleshooting (Resending Invitations)
- If the user did not receive the email, click **"Resend Code"** within the verification modal.
- Ensure the `BREVO_API_KEY` is correctly set in the `.env` file.
- Check the server logs for "Brevo API Delivery Failed" messages if emails are not arriving.

> [!TIP]
> Always advise new vendors/riders to **change their temporary password** immediately after their first successful login for security.
