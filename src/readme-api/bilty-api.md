# Bilty Services — API Reference

Two services handle all bilty (GR/LR freight bill) operations:

| Service | Prefix | Purpose |
|---|---|---|
| **Bilty Settings** | `/v1/bilty-setting` | Master setup: consignors, consignees, books, rates, **templates, discounts** |
| **Bilty** | `/v1/bilty` | Bilty lifecycle: create, view, update, cancel, next GR |

All endpoints require a valid `Authorization: Bearer <token>` header.  
All operations are automatically scoped to the caller's `company_id` and `branch_id` from the JWT.

---

## Bilty Settings Service — `/v1/bilty-setting`

### Consignors (Shippers)

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/bilty-setting/consignors` | Create a new consignor master record |
| `GET` | `/v1/bilty-setting/consignors` | List consignors (supports `search`, `is_active` query params) |
| `GET` | `/v1/bilty-setting/consignors/{consignor_id}` | Get a single consignor |
| `PATCH` | `/v1/bilty-setting/consignors/{consignor_id}` | Update consignor fields |
| `DELETE` | `/v1/bilty-setting/consignors/{consignor_id}` | Soft-delete (sets `is_active=false`) |

**Create / Update fields:**

| Field | Type | Notes |
|---|---|---|
| `consignor_name` | string (required) | min 2 chars |
| `gstin` | string | max 15 chars |
| `pan` | string | max 10 chars |
| `aadhar` | string | max 12 chars |
| `address` | string | |
| `city` | string | |
| `state` | string | |
| `pincode` | string | |
| `mobile` | string | Single mobile number (max 15 chars) |
| `alternate_mobile` | string | Single alternate mobile (max 15 chars) |
| `mobile_numbers` | array of strings OR comma-separated string | Multiple phone numbers. Can be sent as: `["1234123415", "1231132415"]` (array) or `"1234123415,1231132415"` (comma-separated string). Whitespace is automatically trimmed. Stored as JSON array. |
| `email` | string | |
| `metadata` | object | free-form JSON |

**Example — multiple mobile numbers:**
```json
POST /v1/bilty-setting/consignors
{
  "consignor_name": "ABC Logistics",
  "mobile_numbers": "1234123415,1231132415"
}
```

```json
POST /v1/bilty-setting/consignors
{
  "consignor_name": "ABC Logistics",
  "mobile_numbers": ["1234123415", "1231132415"]
}
```

---

### Consignees (Receivers)

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/bilty-setting/consignees` | Create a new consignee master record |
| `GET` | `/v1/bilty-setting/consignees` | List consignees (supports `search`, `is_active`) |
| `GET` | `/v1/bilty-setting/consignees/{consignee_id}` | Get a single consignee |
| `PATCH` | `/v1/bilty-setting/consignees/{consignee_id}` | Update consignee fields |
| `DELETE` | `/v1/bilty-setting/consignees/{consignee_id}` | Soft-delete |

Fields are identical to Consignor — use `consignee_name` as the name field. Supports the same `mobile_numbers` field for storing multiple phone numbers:

| Field | Type | Notes |
|---|---|---|
| `consignee_name` | string (required) | min 2 chars |
| `gstin` | string | max 15 chars |
| `pan` | string | max 10 chars |
| `aadhar` | string | max 12 chars |
| `address` | string | |
| `city` | string | |
| `state` | string | |
| `pincode` | string | |
| `mobile` | string | Single mobile number (max 15 chars) |
| `alternate_mobile` | string | Single alternate mobile (max 15 chars) |
| `mobile_numbers` | array of strings OR comma-separated string | Multiple phone numbers. Can be sent as: `["1234123415", "1231132415"]` (array) or `"1234123415,1231132415"` (comma-separated string). Whitespace is automatically trimmed. Stored as JSON array. |
| `email` | string | |
| `metadata` | object | free-form JSON |

---

### Bilty Books (GR/LR Number Books)

A bilty book defines a sequential range of GR numbers. The DB atomically advances `current_number` on each claim — no duplicate GRs are possible.

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/bilty-setting/books` | Create a new book |
| `GET` | `/v1/bilty-setting/books` | List books (filter: `bilty_type`, `party_scope`, `is_active`, `is_completed`) |
| `GET` | `/v1/bilty-setting/books/{book_id}` | Get a single book |
| `PATCH` | `/v1/bilty-setting/books/{book_id}` | Update meta / flags (number range is immutable) |
| `DELETE` | `/v1/bilty-setting/books/{book_id}` | Soft-delete (issued GR numbers are unaffected) |

**Create fields:**

| Field | Type | Default | Notes |
|---|---|---|---|
| `book_name` | string | null | Human label e.g. `"Book-A 2025-26"` |
| `template_name` | string | null | Legacy label (prefer `template_id`) |
| `template_id` | UUID | null | FK to `bilty_template` — sets print format for all bilties from this book |
| `bilty_type` | `REGULAR` \| `MANUAL` | `REGULAR` | |
| `party_scope` | `COMMON` \| `CONSIGNOR` \| `CONSIGNEE` | `COMMON` | |
| `consignor_id` | UUID | null | Required when `party_scope=CONSIGNOR` |
| `consignee_id` | UUID | null | Required when `party_scope=CONSIGNEE` |
| `prefix` | string | null | Prepended to GR string e.g. `"MUM/"` |
| `from_number` | integer (required) | | Start of range |
| `to_number` | integer (required) | | End of range (≥ from_number) |
| `digits` | integer | 4 | Zero-pad width e.g. 4 → `0042` |
| `postfix` | string | null | Appended e.g. `"/25"` |
| `is_fixed` | boolean | false | If true, number is never auto-incremented |
| `auto_continue` | boolean | false | App creates next book when range is exhausted |

**Party scope rules:**

| `party_scope` | `consignor_id` | `consignee_id` |
|---|---|---|
| `COMMON` | must be null | must be null |
| `CONSIGNOR` | required | must be null |
| `CONSIGNEE` | must be null | required |

---

### Bilty Rates

Rate cards can be set per-consignor or per-consignee for a destination city.

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/bilty-setting/rates` | Create a rate card |
| `GET` | `/v1/bilty-setting/rates` | List rates (filter: `party_type`, `consignor_id`, `consignee_id`, `destination_city_id`, `is_active`) |
| `GET` | `/v1/bilty-setting/rates/{rate_id}` | Get a single rate card |
| `PATCH` | `/v1/bilty-setting/rates/{rate_id}` | Update rate values or validity window |
| `DELETE` | `/v1/bilty-setting/rates/{rate_id}` | Soft-delete |

**Create fields:**

| Field | Type | Notes |
|---|---|---|
| `party_type` | `CONSIGNOR` \| `CONSIGNEE` | Required |
| `consignor_id` | UUID | Required when `party_type=CONSIGNOR` |
| `consignee_id` | UUID | Required when `party_type=CONSIGNEE` |
| `destination_city_id` | UUID | Required — FK to `master_city` |
| `transport_id` | UUID | Optional — preferred transporter for this lane |
| `rate` | number | Freight rate (default 0) |
| `rate_unit` | `PER_KG` \| `PER_NAG` | Default `PER_KG` |
| `minimum_weight_kg` | number | |
| `freight_minimum_amount` | number | |
| `labour_rate` | number | |
| `labour_unit` | `PER_KG` \| `PER_NAG` \| `PER_BILTY` | |
| `dd_charge_per_kg` | number | Door delivery charge per KG |
| `dd_charge_per_nag` | number | Door delivery charge per package |
| `bilty_charge` | number | |
| `receiving_slip_charge` | number | |
| `is_toll_tax_applicable` | boolean | |
| `toll_tax_amount` | number | |
| `is_no_charge` | boolean | FOC / free lane |
| `effective_from` | date string | Defaults to today |
| `effective_to` | date string | null = open-ended |

**Active rate lookup logic:**
```
WHERE (consignor_id = ? OR consignee_id = ?)
  AND is_active = true
  AND effective_from <= today
  AND (effective_to IS NULL OR effective_to >= today)
```

---

### Bilty Templates

Print templates define which format (A4 standard, lorry receipt, monthly bill, etc.) is used when printing.  
Each template has a `template_type` that tells the frontend which screen it belongs to.  
Templates can be branch-wide or optionally pinned to a specific bilty book via `book_id`.  
Set `template_id` on a **book** (applies to all bilties from that book) or on an **individual bilty** (overrides the book-level template).

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/bilty-setting/templates` | Create a template |
| `GET` | `/v1/bilty-setting/templates` | List templates (`is_active`, `template_type`, `book_id` filters) |
| `GET` | `/v1/bilty-setting/templates/primary` | Get the branch primary template |
| `PATCH` | `/v1/bilty-setting/templates/{template_id}/set-primary` | Mark as primary |
| `GET` | `/v1/bilty-setting/templates/{template_id}` | Get a single template |
| `PATCH` | `/v1/bilty-setting/templates/{template_id}` | Update a template |
| `DELETE` | `/v1/bilty-setting/templates/{template_id}` | Soft-delete |

**Fields:**

| Field | Required | Type | Notes |
|---|---|---|---|
| `code` | ✓ | string (max 50) | Unique per company+branch. Machine identifier e.g. `"A4_STD"` |
| `name` | ✓ | string (max 150) | Display name e.g. `"A4 Standard Format"` |
| `description` | | string | |
| `slug` | ✓ | string (max 100) | URL-safe identifier e.g. `"a4-standard"`. Unique per company+branch |
| `template_type` | | string | See table below. Default `"REGULAR_BILTY"` |
| `book_id` | | UUID | Pin to a specific bilty book. `null` = available to whole branch |
| `metadata` | | object | Renderer config: company name, address, GSTIN, logo, etc. |
| `is_primary` | | bool | Only one primary per branch. Set via `set-primary` endpoint |

**`template_type` values:**

| Value | Used for |
|---|---|
| `REGULAR_BILTY` | Printing a standard book-based bilty (default) |
| `MANUAL_BILTY` | Printing a manual / station bilty |
| `MONTHLY_CONSIGNOR` | Monthly consignment bill sent to a consignor |
| `MONTHLY_CONSIGNEE` | Monthly consignment bill sent to a consignee |

**Filtering examples:**
```
GET /v1/bilty-setting/templates?template_type=REGULAR_BILTY
GET /v1/bilty-setting/templates?template_type=MONTHLY_CONSIGNOR
GET /v1/bilty-setting/templates?book_id=<uuid>
```

---

### Bilty Book — `book_defaults`

`book_defaults` is a JSONB column on `bilty_book` that stores pre-fill values for the create-bilty form.  
When the user selects a book (or the system auto-picks the primary book), the frontend reads `book_defaults` and pre-populates the relevant fields — saving the user from re-entering values that are the same for every bilty in that book.

**Set on book create or update** via `POST /v1/bilty-setting/books` or `PATCH /v1/bilty-setting/books/{book_id}`:
```json
{
  "book_defaults": {
    "delivery_type": "GODOWN",
    "payment_mode":  "TO-PAY",
    "from_city_id":  "0fb3a1fd-933b-46fa-b7d8-1bab7a99e43d"
  }
}
```

**Supported keys in `book_defaults`:**

| Key | Type | Example | Pre-fills |
|---|---|---|---|
| `delivery_type` | string | `"GODOWN"` \| `"DOOR"` | Delivery Type field |
| `payment_mode` | string | `"TO-PAY"` \| `"PAID"` \| `"FOC"` | Payment Mode field |
| `from_city_id` | UUID | `"0fb3a1fd-..."` | From City dropdown |
| `to_city_id` | UUID | `"<city_uuid>"` | To City dropdown |
| `transport_id` | UUID | `"<transport_uuid>"` | Transporter dropdown |

All keys are optional — only include the ones you want to pre-fill. Any key not present means the field starts blank.

**Frontend usage (after fetching the primary book):**
```js
const book = await GET('/v1/bilty-setting/books/primary?bilty_type=REGULAR')
const d = book.book_defaults ?? {}

form.delivery_type = d.delivery_type ?? ''
form.payment_mode  = d.payment_mode  ?? ''
form.from_city_id  = d.from_city_id  ?? null
form.to_city_id    = d.to_city_id    ?? null
form.transport_id  = d.transport_id  ?? null
```

---

### Bilty Discounts

Discount master. A discount can be scoped to a specific book (`bill_book_id`) or applied branch-wide (`bill_book_id = null`).  
The discount is applied by storing the resolved values (`discount_id`, `discount_percentage`, `discount_amount`) on the bilty at creation time.

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/bilty-setting/discounts` | Create a discount |
| `GET` | `/v1/bilty-setting/discounts` | List discounts (filter: `bill_book_id`, `is_active`) |
| `GET` | `/v1/bilty-setting/discounts/{discount_id}` | Get a single discount |
| `PATCH` | `/v1/bilty-setting/discounts/{discount_id}` | Update a discount |
| `DELETE` | `/v1/bilty-setting/discounts/{discount_id}` | Soft-delete |

**Fields:**

| Field | Required | Type | Notes |
|---|---|---|---|
| `discount_code` | ✓ | string (max 50) | Unique per company+branch e.g. `"DIWALI10"` |
| `percentage` | ✓ | number 0-100 | % of `total_amount` to discount |
| `bill_book_id` | | UUID | Restrict to a specific book. `null` = any book |
| `max_amount_discounted` | | number | Cap on the discount value. `null` = no cap |
| `minimum_amount` | | number | Bilty `total_amount` must be ≥ this. Default 0 |

**Discount application logic (app layer):**
```
if total_amount >= discount.minimum_amount:
    discount_amount = total_amount * (discount.percentage / 100)
    if discount.max_amount_discounted is not None:
        discount_amount = min(discount_amount, discount.max_amount_discounted)
    final_amount = total_amount - discount_amount
```

---

## Bilty Service — `/v1/bilty`

### Next GR Number

```
GET /v1/bilty/next-gr/{book_id}
```

Atomically claims the next available GR number from a book row using a DB-level `FOR UPDATE` lock. Two concurrent requests will never receive the same number.

**Response:**
```json
{
  "gr_no": "MUM/0042/25",
  "gr_number": 42,
  "book_id": "<uuid>"
}
```

**Error codes:**
- `404` — Book does not exist or is inactive
- `410` — Book is exhausted (all numbers used)

---

### REGULAR bilty workflow

```
1. GET  /v1/bilty/next-gr/{book_id}        → get gr_no + gr_number
2. POST /v1/bilty  { gr_no, book_id, ... } → create bilty
```

Both steps should be in the same client transaction to ensure gr_no consistency.

### MANUAL bilty workflow

```
POST /v1/bilty  { gr_no: "MANUAL-001", bilty_type: "MANUAL", ... }
```

`book_id` is omitted — the GR string is provided directly.

---

### Bilty CRUD

| Method | Path | Description |
|---|---|---|
| `GET` | `/v1/bilty/next-gr/{book_id}` | Claim next GR from a book |
| `POST` | `/v1/bilty` | Create a new bilty |
| `GET` | `/v1/bilty` | List bilties (see filters below) |
| `GET` | `/v1/bilty/{bilty_id}` | Get a single bilty |
| `PATCH` | `/v1/bilty/{bilty_id}` | Update fields / advance lifecycle |
| `DELETE` | `/v1/bilty/{bilty_id}` | Cancel (soft-delete) — requires `deletion_reason` in body |

**List query parameters:**

| Param | Values | Description |
|---|---|---|
| `bilty_type` | `REGULAR` \| `MANUAL` | |
| `status` | see lifecycle below | |
| `payment_mode` | `PAID` \| `TO-PAY` \| `FOC` | |
| `consignor_id` | UUID | |
| `consignee_id` | UUID | |
| `from_date` | ISO date | Filter on `bilty_date` |
| `to_date` | ISO date | Filter on `bilty_date` |
| `is_active` | bool (default true) | |
| `limit` | 1–500 (default 50) | |
| `offset` | 0+ (default 0) | Pagination |

---

### Bilty fields — new in v005

| Field | Type | Notes |
|---|---|---|
| `e_way_bills` | `array of objects` | **Replaces `e_way_bill`**. Array of EWB objects: `[{"ewb_no": "...", "valid_upto": "...", "vehicle_no": "..."}]`. Empty array `[]` when no EWBs. |
| `actual_weight` | number | Physical weight. `weight` = billed weight. Both can differ. |
| `template_id` | UUID | FK to `bilty_template`. Overrides the book-level template for this bilty. |
| `local_charge` | number | Local delivery / handling charge. Default 0. |
| `discount_id` | UUID | FK to `bilty_discount`. Set when a discount is applied. |
| `discount_percentage` | number 0-100 | Snapshot of the discount percentage at time of creation. |
| `discount_amount` | number ≥ 0 | Computed discount amount = `total_amount * discount_percentage / 100` (capped). |
| `consignor_mobile_numbers` | array of strings OR comma-separated string | Multiple phone numbers for consignor. Can be sent as: `["1234123415", "1231132415"]` (array) or `"1234123415,1231132415"` (comma-separated string). Whitespace is automatically trimmed. Stored as JSON array. |
| `consignee_mobile_numbers` | array of strings OR comma-separated string | Multiple phone numbers for consignee. Can be sent as: `["1234123415", "1231132415"]` (array) or `"1234123415,1231132415"` (comma-separated string). Whitespace is automatically trimmed. Stored as JSON array. |
| `transport_mobile_numbers` | array of strings OR comma-separated string | Multiple phone numbers for transport/vehicle. Can be sent as: `["1234123415", "1231132415"]` (array) or `"1234123415,1231132415"` (comma-separated string). Whitespace is automatically trimmed. Stored as JSON array. |

**Example — bilty with multiple mobile numbers:**
```json
POST /v1/bilty
{
  "bilty_type": "MANUAL",
  "gr_no": "1702",
  "bilty_date": "2026-05-14",
  "consignor_name": "ABC Logistics",
  "consignor_mobile_numbers": "1321321111,1234123445",
  "consignee_name": "XYZ Traders",
  "consignee_mobile_numbers": ["9044396743", "9876543210"],
  "transport_name": "Express Transport",
  "transport_mobile_numbers": "9111222333,9444555666"
}
```

---
DRAFT
  └─► SAVED
        └─► DISPATCHED
               └─► REACHED_HUB
                      └─► AT_GODOWN
                             └─► OUT_FOR_DELIVERY
                                    └─► DELIVERED
                                    └─► UNDELIVERED
              └─► LOST
              └─► CANCELLED   ← also reached via DELETE endpoint
```

When advancing status via `PATCH`, set the matching boolean and timestamp together:

| Status | Boolean | Timestamp field | `_by` field |
|---|---|---|---|
| `DISPATCHED` | `is_dispatched` | `dispatched_at` | `dispatched_by` (auto-set) |
| `REACHED_HUB` | `is_reached_hub` | `reached_hub_at` | `reached_hub_by` (auto-set) |
| `AT_GODOWN` | `is_at_godown` | `at_godown_at` | `at_godown_by` (auto-set) |
| `OUT_FOR_DELIVERY` | `is_out_for_delivery` | `out_for_delivery_at` | `out_for_delivery_by` (auto-set) |
| `DELIVERED` | `is_delivered` | `delivered_at` | `delivered_by` (auto-set) |

The `_by` UUID fields are automatically set to the caller's user ID — no need to pass them.

**Example — mark dispatched:**
```json
PATCH /v1/bilty/{bilty_id}
{
  "status": "DISPATCHED",
  "is_dispatched": true,
  "dispatched_at": "2026-04-27T10:30:00Z",
  "dispatched_challan_no": "CH-0123"
}
```

**Example — cancel:**
```json
DELETE /v1/bilty/{bilty_id}
{
  "deletion_reason": "Duplicate entry — GR issued in error"
}
```

---

## Soft Delete Policy

| Table | Soft-delete fields |
|---|---|
| `bilty_consignor` | `is_active = false` |
| `bilty_consignee` | `is_active = false` |
| `bilty_book` | `is_active = false` |
| `bilty_rate` | `is_active = false` |
| `bilty_template` | `is_active = false` |
| `bilty_discount` | `is_active = false` |
| `bilty` | `is_active = false` + `status = CANCELLED` + `deleted_at` + `deleted_by` + `deletion_reason` |

Never hard-delete any bilty-module row.

---

## File Structure

```
app/
├── services/
│   ├── bilty_setting/
│   │   ├── __init__.py
│   │   └── service.py      ← consignor, consignee, book, rate, template, discount DB logic
│   └── bilty/
│       ├── __init__.py
│       └── service.py      ← bilty CRUD + next_gr_no RPC
└── v1/
    ├── bilty_setting.py    ← FastAPI router (/v1/bilty-setting/...)
    └── bilty.py            ← FastAPI router (/v1/bilty/...)
```

{
"message": "Bilty created.",
"bilty": {
"bilty_id": "cac7c067-8f31-446a-a61e-5e4cd7c06ebd",
"company_id": "815fcdb9-c36b-4288-9ed3-8210eaf40332",
"branch_id": "0c15b4c4-3d14-4c68-af43-c8ce7e738fd7",
"gr_no": "1702",
"book_id": "b287ccf9-86f1-4f81-a5f2-fb2be3f05233",
"bilty_type": "MANUAL",
"bilty_date": "2026-05-14",
"consignor_id": "6502f8cd-57fd-474e-81e5-a67fc2e5b270",
"consignor_name": "MALA RAMENY SONA",
"consignor_gstin": "06AALPJ5476A1ZT",
"consignor_mobile": null,
"consignee_id": "c2cefc18-e9ae-4c95-a5d0-9e072d22a5ff",
"consignee_name": "NEW UPPAR DRESSES",
"consignee_gstin": "09AHXPG0610L1Z3",
"consignee_mobile": null,
"transport_id": "3be455ff-997d-4324-b322-7dad13fa892e",
"transport_name": "SS TRANSPORT CORPORATION",
"transport_gstin": null,
"transport_mobile": null,
"from_city_id": "ce216191-e55b-440b-ae40-e2d70e494b3e",
"to_city_id": "f0162aa1-7bf6-4c7a-894a-93d0845027c7",
"delivery_type": "GODOWN",
"payment_mode": "TO-PAY",
"contain": null,
"invoice_no": null,
"invoice_value": 0.0,
"invoice_date": null,
"e_way_bills": [],
"document_number": null,
"no_of_pkg": 0,
"weight": null,
"rate": null,
"pvt_marks": null,
"freight_amount": 0.0,
"labour_rate": null,
"labour_charge": 0.0,
"bill_charge": 0.0,
"toll_charge": 0.0,
"dd_charge": 0.0,
"pf_charge": 0.0,
"other_charge": 0.0,
"total_amount": 0.0,
"pdf_url": null,
"saving_option": "SAVE",
"status": "SAVED",
"is_dispatched": false,
"dispatched_at": null,
"dispatched_challan_no": null,
"dispatched_by": null,
"is_reached_hub": false,
"reached_hub_at": null,
"reached_hub_by": null,
"is_at_godown": false,
"at_godown_at": null,
"at_godown_by": null,
"is_out_for_delivery": false,
"out_for_delivery_at": null,
"out_for_delivery_by": null,
"is_delivered": false,
"delivered_at": null,
"delivered_by": null,
"delivery_remark": null,
"pod_image_url": null,
"is_active": true,
"deleted_at": null,
"deleted_by": null,
"deletion_reason": null,
"tracking_meta": {},
"remark": null,
"metadata": {},
"created_at": "2026-05-14T06:05:09.138135+00:00",
"updated_at": "2026-05-14T06:05:09.138135+00:00",
"created_by": "ab10fcbb-eb8e-434a-8272-ca1991bbfaed",
"updated_by": "ab10fcbb-eb8e-434a-8272-ca1991bbfaed",
"actual_weight": null,
"template_id": "b40dc6d5-61ba-449f-95d1-af69b110c5f7",
"local_charge": 0.0,
"discount_id": null,
"discount_percentage": 0.0,
"discount_amount": 0.0,
"challan_id": null,
"challan_branch_id": null,
"trip_sheet_id": null,
"challan_assigned_at": null,
"challan_assigned_by": null,
"kaat_rate": 0,
"kaat_rate_type": null,
"kaat_weight_charged": 0,
"kaat_base_amount": 0,
"kaat_receiving_slip_charge": 0,
"kaat_bilty_charge": 0,
"kaat_labour_rate": 0,
"kaat_labour_rate_type": null,
"kaat_labour_charge": 0,
"kaat_other_charges": [],
"kaat_other_charges_total": 0,
"kaat_amount": 0,
"real_dd_charge": 0,
"transit_profit": 0,
"crossing_proof_type": null,
"crossing_proof_ref": null,
"consignor_mobile_numbers": [
"1234132415",
"1234123412"
],
"consignee_mobile_numbers": [
"9044396743",
"1234123414"
],
"transport_mobile_numbers": null
}
}
2026-05-14 06:05:09 | INFO     | uvicorn.access | 10.0.1.3:33852 - "POST /v1/bilty HTTP/1.1" 201
2026-05-14 06:05:09 | INFO     | httpx | HTTP Request: POST http://supabasekong-a5tmxn7eqgoivxs2a9gp37lz.46.202.162.119.sslip.io/rest/v1/logs_request_log?columns=%22user_id%22%2C%22method%22%2C%22status_code%22%2C%22duration_ms%22%2C%22ip_address%22%2C%22user_agent%22%2C%22query_params%22%2C%22path%22%2C%22request_body%22%2C%22branch_id%22%2C%22company_id%22%2C%22correlation_id%22%2C%22client_type%22%2C%22error_message%22%2C%22session_id%22 "HTTP/1.1 201 Created"
2026-05-14 06:05:09 | INFO     | movesure | → [16f07615] GET /v1/bilty | client: browser_chrome | body: 
2026-05-14 06:05:09 | INFO     | httpx | HTTP Request: GET http://supabasekong-a5tmxn7eqgoivxs2a9gp37lz.46.202.162.119.sslip.io/rest/v1/bilty?select=%2A&company_id=eq.815fcdb9-c36b-4288-9ed3-8210eaf40332&branch_id=eq.0c15b4c4-3d14-4c68-af43-c8ce7e738fd7&is_active=eq.True&order=bilty_date.desc%2Ccreated_at.desc&limit=500&offset=0&bilty_type=eq.MANUAL "HTTP/1.1 200 OK"
2026-05-14 06:05:09 | INFO     | movesure | ← [16f07615] GET /v1/bilty | status: 200 | 33 ms
RESPONSE:
{
"count": 6,
"bilties": [
{
"bilty_id": "cac7c067-8f31-446a-a61e-5e4cd7c06ebd",
"company_id": "815fcdb9-c36b-4288-9ed3-8210eaf40332",
"branch_id": "0c15b4c4-3d14-4c68-af43-c8ce7e738fd7",
"gr_no": "1702",
"book_id": "b287ccf9-86f1-4f81-a5f2-fb2be3f05233",
"bilty_type": "MANUAL",
"bilty_date": "2026-05-14",
"consignor_id": "6502f8cd-57fd-474e-81e5-a67fc2e5b270",
"consignor_name": "MALA RAMENY SONA",
"consignor_gstin": "06AALPJ5476A1ZT",
"consignor_mobile": null,
"consignee_id": "c2cefc18-e9ae-4c95-a5d0-9e072d22a5ff",
"consignee_name": "NEW UPPAR DRESSES",
"consignee_gstin": "09AHXPG0610L1Z3",
"consignee_mobile": null,
"transport_id": "3be455ff-997d-4324-b322-7dad13fa892e",
"transport_name": "SS TRANSPORT CORPORATION",
"transport_gstin": null,
"transport_mobile": null,
"from_city_id": "ce216191-e55b-440b-ae40-e2d70e494b3e",
"to_city_id": "f0162aa1-7bf6-4c7a-894a-93d0845027c7",
"delivery_type": "GODOWN",
"payment_mode": "TO-PAY",
"contain": null,
"invoice_no": null,
"invoice_value": 0.0,
"invoice_date": null,
"e_way_bills": [],
"document_number": null,
"no_of_pkg": 0,
"weight": null,
"rate": null,
"pvt_marks": null,
"freight_amount": 0.0,
"labour_rate": null,
"labour_charge": 0.0,
"bill_charge": 0.0,
"toll_charge": 0.0,
"dd_charge": 0.0,
"pf_charge": 0.0,
"other_charge": 0.0,
"total_amount": 0.0,
"pdf_url": null,
"saving_option": "SAVE",
"status": "SAVED",
"is_dispatched": false,
"dispatched_at": null,
"dispatched_challan_no": null,
"dispatched_by": null,
"is_reached_hub": false,
"reached_hub_at": null,
"reached_hub_by": null,
"is_at_godown": false,
"at_godown_at": null,
"at_godown_by": null,
"is_out_for_delivery": false,
"out_for_delivery_at": null,
"out_for_delivery_by": null,
"is_delivered": false,
"delivered_at": null,
"delivered_by": null,
"delivery_remark": null,
"pod_image_url": null,
"is_active": true,
"deleted_at": null,
"deleted_by": null,
"deletion_reason": null,
"tracking_meta": {},
"remark": null,
"metadata": {},
"created_at": "2026-05-14T06:05:09.138135+00:00",
"updated_at": "2026-05-14T06:05:09.138135+00:00",
"created_by": "ab10fcbb-eb8e-434a-8272-ca1991bbfaed",
"updated_by": "ab10fcbb-eb8e-434a-8272-ca1991bbfaed",
"actual_weight": null,
"template_id": "b40dc6d5-61ba-449f-95d1-af69b110c5f7",
"local_charge": 0.0,
"discount_id": null,
"discount_percentage": 0.0,
"discount_amount": 0.0,
"challan_id": null,
"challan_branch_id": null,
"trip_sheet_id": null,
"challan_assigned_at": null,
"challan_assigned_by": null,
"kaat_rate": 0,
"kaat_rate_type": null,
"kaat_weight_charged": 0,
"kaat_base_amount": 0,
"kaat_receiving_slip_charge": 0,
"kaat_bilty_charge": 0,
"kaat_labour_rate": 0,
"kaat_labour_rate_type": null,
"kaat_labour_charge": 0,
"kaat_other_charges": [],
"kaat_other_charges_total": 0,
"kaat_amount": 0,
"real_dd_charge": 0,
"transit_profit": 0,
"crossing_proof_type": null,
"crossing_proof_ref": null,
"consignor_mobile_numbers": [
"1234132415",
"1234123412"
],
"consignee_mobile_numbers": [
"9044396743",
"1234123414"
],
"transport_mobile_numbers": null
},
IT IS GIVIGN AS THIS OUTPUT WHEN FETCH WHEN CLCIK ON EDIT ON MANUAL BILTY EDIT .., CAN YOU SHOW THE NUMBER BY THIS JSON FORMAT PROPERLY IN THE INPUT ..IN COMMA ..SHOW THE NUMBERS PROPERLY IN THE UI , CURRENYLY I AM NOT ABLE TO DO IT 