# UPI Payment Works

Step 1: VPA Creation
--------------------------------------------------------------------------------------
- The customer creates a Virtual Payment Address (VPA) using their PSP’s mobile app.
- The request is sent to the VPA Management Service, which verifies and registers the VPA, responding with a success message.

Step 2: Initiating Payment
--------------------------------------------------------------------------------------
- The customer initiates a payment by scanning a QR code using the QR Code Scanner or entering the payee’s VPA.
- The PSP sends a payment request to the NPCI UPI Network to start the process.

Step 3: Payment Authorization
--------------------------------------------------------------------------------------
- The customer authorizes the payment through their PSP app using MPIN, biometric verification, or 2FA.
- The Payer PSP forwards the authorization to the NPCI UPI Switch for processing.

Step 4: Payment Processing
--------------------------------------------------------------------------------------
- The NPCI Switch sends a debit request to the Remitter/Issuer Bank (payer’s bank), where the bank verifies the available balance.
- The Remitter Bank responds to the NPCI with the result of the debit request.
- Upon successful debit, the NPCI sends a credit request to the Beneficiary Bank (payee’s bank), which credits the payee’s account.

Step 5: Payee Details Validation
--------------------------------------------------------------------------------------
- The NPCI Switch requests the payee details from the Payee PSP to ensure the payee’s identity and details are accurate.
- The Payee PSP validates the details and confirms them with the NPCI network.

Step 6: Transaction Completion
--------------------------------------------------------------------------------------
- Once the transaction is completed, the NPCI sends a debit response to the Payer PSP, confirming the transaction status.
- The Payer PSP notifies the customer about the successful transaction.
- Similarly, the Payee PSP notifies the payee about the received payment.
