---
description: How to add a Take Away option to the project
---
1. Update `server/models/Order.js` to include `orderType` and ensure `deliveryAddress` is optional.
2. Update `server/controllers/student.controller.js`:
    - `calculateOrderBill`: Adjust `deliveryFee` based on `orderType`.
    - `placeOrder`: Save `orderType` and handle missing `deliveryAddress` for Take Away.
3. Update `server/controllers/vendor.controller.js`:
    - Update `updateOrderStatus` to handle student pickup with OTP for Take Away orders.
4. Update `server/controllers/delivery.controller.js`:
    - `getAvailableOrders`: Filter out Take Away orders.
5. Update `client/src/pages/student/CartPage.jsx`:
    - Add UI to select Take Away and update bill calculation.
6. Update `client/src/pages/student/OrderTracking.jsx`:
    - Update UI to show pickup-specific instructions.
7. Update Vendor Dashboard UI:
    - Distinguish Take Away orders and add OTP verification for pickup.
