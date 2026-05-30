# Mobile Fit Polish

## Goal

Fix the phone issues shown in the screenshots: booking chat controls should fit comfortably, and the booking form should not create horizontal overflow.

## Scope

1. Add source-level checks for the mobile fit guardrails.
2. Add reusable mobile overflow and chat reply utility classes.
3. Apply those guardrails to the booking form shell and fields.
4. Compact the chat composer quick replies and message input on phones.
5. Keep the global account chip from covering booking form controls on mobile.

## Out Of Scope

- No database changes.
- No chat API changes.
- No booking payment changes.
