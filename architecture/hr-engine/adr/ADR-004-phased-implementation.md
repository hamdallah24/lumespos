# ADR-004: Phased Implementation

## Status

Accepted

## Context

HR Engine scope covers employee management, organizational structure, attendance, leave, and payroll. Building everything at once delays value delivery.

## Decision

Deliver in 3 phases:

### Phase P0 — Employee + Organization

Tables: `departments`, `positions`, `employees`, `hr_events`
Services: employee CRUD, department hierarchy, position management
Routes: /hr/employees, /hr/departments, /hr/positions
Frontend: Employee list, detail, department tree

### Phase P1 — Attendance + Leave

Tables: `attendance_records`, `leave_requests`
Services: check-in/out, leave request/approval
Routes: /hr/attendance, /hr/leaves
Frontend: Attendance dashboard, leave calendar

### Phase P2 — Payroll

Tables: `payroll_batches`, `payroll_slips`
Services: payroll computation, batch processing, payslip generation
Finance: hrEventConsumer for salary accrual
Frontend: Payroll batch, pay slip viewer

## Consequences

- + Value delivered every phase
- + Payroll benefits from stable employee and attendance data (built in P0/P1)
- + Early focus on data quality before financial impact
