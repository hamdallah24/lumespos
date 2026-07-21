# HR Engine — Architecture

## 1. Core Principle

**HR Engine is the owner of organizational truth.**

Finance owns financial truth.
Inventory owns inventory truth.
HR owns people, structure, attendance, and payroll truth.

The engine answers one question:

> **"Who is in the organization, what is their role, where are they, and what are they owed?"**

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    HR Engine (Write Model)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Employee      │  │ Attendance   │  │ Payroll          │  │
│  │ Service       │  │ Service      │  │ Engine           │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │             │
│         ▼                 ▼                    ▼             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              HR Event Sourcing Layer                  │   │
│  │  Every change → immutable HR Event → Projection      │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Projection Cache                         │   │
│  │  employee_summary  attendance_summary  payroll_view   │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Event Store (publish)                    │   │
│  └──────────────────────┬──────────────────────────────┘   │
└─────────────────────────┼──────────────────────────────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │  Finance Event       │
               │  Consumer            │
               │  (journals for       │
               │   payroll accrual)   │
               └──────────────────────┘
```

---

## 3. Entity Model

```
Organization
    │
    ├── Departments (hierarchical)
    │       │
    │       ├── Positions
    │       │       │
    │       │       └── Employees (linked to Users)
    │       │
    │       └── Branches (existing table)
    │
    ├── Attendance Records
    │       ├── Check-in / Check-out
    │       ├── Leave Requests
    │       └── Overtime
    │
    └── Payroll Records
            ├── Salary Components
            ├── Deductions
            ├── Pay Slips
            └── Payroll Batches
```

---

## 4. Data Model

### 4.1 `departments`

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| name | text NOT NULL | |
| parent_id | int self-FK | hierarchical org tree |
| head_position_id | int FK→positions | department head |
| branch_id | int FK→branches | |
| is_active | boolean | default true |
| created_at | timestamptz | |

### 4.2 `positions`

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| title | text NOT NULL | e.g. "Cashier", "Chef", "Manager" |
| department_id | int FK→departments | |
| grade | text | 'junior' \| 'senior' \| 'lead' \| 'head' |
| base_salary | numeric(14,2) | |
| created_at | timestamptz | |

### 4.3 `employees`

Linked to `users` but independent (an employee can exist without system access).

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| user_id | int FK→users | nullable — employee may not have login |
| employee_code | text UNIQUE | auto-generated EMP-XXXX |
| full_name | text NOT NULL | |
| position_id | int FK→positions | |
| department_id | int FK→departments | |
| branch_id | int FK→branches | primary assignment |
| hire_date | date | |
| resignation_date | date | nullable |
| status | text | 'active' \| 'resigned' \| 'terminated' \| 'on_leave' |
| id_number | text | national ID |
| phone | text | |
| address | text | |
| bank_name | text | |
| bank_account | text | |
| tax_id | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 4.4 `attendance_records`

| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| employee_id | int FK→employees | |
| date | date NOT NULL | |
| check_in | timestamptz | |
| check_out | timestamptz | |
| status | text | 'present' \| 'absent' \| 'late' \| 'half_day' \| 'leave' |
| late_minutes | int | |
| early_leave_minutes | int | |
| overtime_minutes | int | |
| notes | text | |
| created_by | int FK→users | |
| created_at | timestamptz | |

Unique constraint: `(employee_id, date)`

### 4.5 `leave_requests`

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| employee_id | int FK→employees | |
| leave_type | text | 'annual' \| 'sick' \| 'maternity' \| 'paternity' \| 'unpaid' |
| start_date | date | |
| end_date | date | |
| total_days | int | computed |
| reason | text | |
| status | text | 'pending' \| 'approved' \| 'rejected' \| 'cancelled' |
| approved_by | int FK→users | |
| approved_at | timestamptz | |
| created_at | timestamptz | |

### 4.6 `payroll_batches`

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| period_name | text | e.g. "July 2026" |
| period_start | date | |
| period_end | date | |
| processed_at | timestamptz | |
| total_amount | numeric(14,2) | sum of all slips |
| status | text | 'draft' \| 'approved' \| 'paid' |
| approved_by | int FK→users | |
| created_at | timestamptz | |

### 4.7 `payroll_slips`

| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| batch_id | int FK→payroll_batches | |
| employee_id | int FK→employees | |
| base_salary | numeric(14,2) | |
| allowances | jsonb | list of {name, amount} |
| deductions | jsonb | list of {name, amount} |
| overtime_pay | numeric(14,2) | |
| attendance_deductions | numeric(14,2) | |
| tax_amount | numeric(14,2) | |
| net_salary | numeric(14,2) | computed |
| created_at | timestamptz | |

### 4.8 `hr_events` — Immutable Event Store

| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| event_type | text | 'employee.hired' \| 'employee.promoted' \| 'attendance.recorded' \| 'leave.approved' \| 'payroll.processed' |
| aggregate_type | text | 'employee' \| 'attendance' \| 'leave' \| 'payroll' |
| aggregate_id | int | |
| data | jsonb | |
| metadata | jsonb | who, when, source |
| created_at | timestamptz | |

---

## 5. Event Sourcing — HR Events

Every HR state change writes to `hr_events` (immutable log). Projections are rebuilt from these events.

### Event Types

| Event | Trigger | Finance Impact |
|---|---|---|
| `employee.hired` | Employee created | None |
| `employee.promoted` | Position/grade change | Future salary change |
| `employee.resigned` | Resignation recorded | None |
| `attendance.recorded` | Check-in/out | Affects payroll calculation |
| `leave.approved` | Leave approved | Affects attendance |
| `payroll.processed` | Payroll batch completed | ✅ **Publishes event to Finance** |
| `payroll.paid` | Salary disbursed | ✅ **Finance creates journal** |

### Payroll → Finance Integration (Same as Inventory)

**HR never creates accounting journals.**

```
Payroll Batch Approved
    │
    ▼
HR Engine
    │
    ├── Compute salaries, deductions, net
    ├── Generate payslips
    ├── Write hr_events (immutable)
    └── Publish to event_store ──────────────► Finance Consumer
                                                   │
                                                   ├── Debit: Salary Expense (6000)
                                                   ├── Credit: Salary Payable (2100)
                                                   └── When paid: Debit Payable, Credit Cash
```

---

## 6. CQRS-lite

```
Write Model:
  Employee CRUD → hr_events → employee_summary projection
  Attendance    → hr_events → attendance_summary projection
  Payroll       → hr_events → payroll_view projection

Read Model:
  employee_list (projection)
  attendance_today (projection)
  payroll_history (projection)
  org_chart (computed from departments + positions + employees)
```

Only the HR service layer may write to HR tables. All dashboard data reads projections.

---

## 7. Module Structure

```
artifacts/api-server/src/hr/
├── services/
│   ├── employeeService.ts      # Employee CRUD + history
│   ├── attendanceService.ts    # Check-in/out, status
│   ├── leaveService.ts         # Leave requests + approval
│   ├── payrollService.ts       # Payroll computation + batch
│   ├── departmentService.ts    # Org structure
│   ├── positionService.ts      # Position management
│   ├── projectionService.ts    # Rebuild projections from hr_events
│   └── hrEventPublisher.ts     # Publish to event_store
├── routes/
│   ├── employees.ts            # CRUD /hr/employees
│   ├── attendance.ts           # POST /hr/attendance/check-in etc.
│   ├── leaves.ts               # CRUD /hr/leaves
│   ├── payroll.ts              # POST /hr/payroll/process
│   └── departments.ts          # CRUD /hr/departments
├── events/
│   └── index.ts                # Event type constants
└── index.ts                    # Barrel exports

artifacts/api-server/src/finance/services/
├── hrEventConsumer.ts          # NEW: consumes HR events → creates journals

artifacts/pos-app/src/modules/hr/
├── pages/
│   ├── EmployeeListPage.tsx
│   ├── EmployeeDetailPage.tsx
│   ├── AttendancePage.tsx
│   ├── LeavePage.tsx
│   ├── PayrollPage.tsx
│   └── DepartmentPage.tsx
├── types/index.ts
├── hooks/useHr.ts
└── components/
    ├── EmployeeForm.tsx
    ├── AttendanceCard.tsx
    └── PayrollSummary.tsx
```

---

## 8. Implementation Phases

### Phase P0 — Employee + Organization Core

| Component | Deliverable |
|---|---|
| Employee Master | `employees` table, CRUD APIs, UI |
| Department Structure | `departments`, `positions` tables, hierarchical |
| HR Event Store | `hr_events` table, immutable event sourcing |
| Projection Cache | Employee summary projection, rebuild tool |
| User ↔ Employee Link | Link existing `users` to `employees` |

### Phase P1 — Attendance + Leave

| Component | Deliverable |
|---|---|
| Attendance Recording | Check-in/out APIs, late/early detection |
| Leave Management | Request → approve → reject workflow |
| Attendance Dashboard | Today's attendance, absences, late list |
| HR → Finance Events | salary.accrued event for payroll |

### Phase P2 — Payroll

| Component | Deliverable |
|---|---|
| Payroll Computation | Base salary + allowances - deductions |
| Payroll Batch | Batch processing, approval workflow |
| Pay Slip Generation | Per-employee payslip |
| Payroll → Finance Event | Automatic salary expense journal entry |

---

## 9. Finance Integration Contract

### Accounts Required

| Code | Name | Type |
|---|---|---|
| 6000 | Beban Gaji | expense |
| 2100 | Utang Gaji | liability |

### Events

| Event | Debit | Credit |
|---|---|---|
| `payroll.batch_approved` | 6000 (Salary Expense) | 2100 (Salary Payable) |
| `payroll.salary_paid` | 2100 (Salary Payable) | 1000 (Cash) |

**HR never creates journals.** Finance is the only journal creator.
