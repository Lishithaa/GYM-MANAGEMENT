# Locality Matching Rollout

## Slice A
- Deploy apartment/locality admin CRUD endpoints and admin dashboard tab.
- Deploy trainer apartment opt-in/out endpoints and trainer dashboard controls.
- Deploy notification persistence endpoints and realtime notification stream.
- Deploy user apartment typeahead on trainers page and locality trainer filtering.

## Slice B
- Deploy user invite workflow from trainer listing.
- Deploy trainer invitation acceptance/rejection workflow.
- On acceptance, create booking request via existing booking service.
- Surface booking/class details through existing `/booking/:id` path for user and trainer dashboards.

## Verification Checklist
- Admin creates apartment: user + trainer receive notification without refresh.
- Trainer opts into apartment: user searches apartment and can view trainer.
- User sends invite: trainer sees pending invite and can accept/reject.
- Accept flow creates booking in initiated state and sends user notification.
- User and trainer can open booking details page for the created booking.
