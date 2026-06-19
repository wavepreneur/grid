-- Idempotent bookings from Exitmania/Tabbrain via booking_reference

create unique index if not exists events_org_booking_reference_uidx
  on public.events (organization_id, booking_reference)
  where booking_reference is not null;

comment on index public.events_org_booking_reference_uidx is
  'One GRID event per external booking_reference per organization (Exitmania/Tabbrain provisioning).';
