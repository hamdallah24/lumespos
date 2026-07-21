# ADR-001: Employee Entity Separate from User Account

## Status

Accepted

## Context

The existing `users` table represents system login accounts (Clerk-authenticated). An employee is an organizational entity who may or may not have system access. Some employees (e.g., kitchen staff) may not need POS login credentials. Combining them would force every employee to be a system user.

## Decision

Create a separate `employees` table with an optional `user_id` FK to `users`. An employee can exist without a user account. A user can exist without being an employee (e.g., external auditors).

## Consequences

- + Clean separation of concerns (auth vs HR)
- + Non-system employees are supported
- + No migration needed on existing users table
- - Join required when displaying employee details for users with accounts

## Trade-offs

Separation is prioritised over query convenience.
