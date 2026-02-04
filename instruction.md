<context>
We will execute the task below

**Description:**
Endpoint untuk set jadwal pemilihan dan manage status election lifecycle.

**Acceptance Criteria:**

- [ ] `POST /api/v1/superadmin/election/schedule` — set jadwal
  - Terima: `{ start_date, end_date }` (ISO 8601, WIB)
  - Validasi: end > start, duration min 6 jam, max 7 hari, start harus di masa depan
  - Simpan ke `election_config` dengan status `SCHEDULED`
  - Log action
- [ ] `GET /api/v1/superadmin/election/config` — get current config
- [ ] `GET /api/v1/election/status` — **public endpoint** return current election status dan dates
- [ ] Automatic status transition:
  - `SCHEDULED` → `ACTIVE` ketika current time >= start_date
  - `ACTIVE` → `CLOSED` ketika current time >= end_date
  - Status check ini dilakukan via middleware atau scheduler yang run sebelum setiap request
- [ ] Protected: SUPERADMIN only (kecuali public status endpoint)
- [ ] Action di-log

**Description:**
Endpoint untuk memperpanjang waktu voting oleh superadmin.

**Acceptance Criteria:**

- [ ] `PUT /api/v1/superadmin/election/extend` — terima `{ new_end_date, reason }`
- [ ] Validasi:
  - Election status harus `ACTIVE`
  - `new_end_date` harus setelah `end_date` saat ini
  - Extension max 24 jam dari end_date original
  - `reason` required (min 10 chars)
- [ ] Update `end_date` di `election_config`
- [ ] Kirim notification email ke semua voters (pakai `EmailService` yang sudah ada). Kemudian buat template email baru dengan mengikuti template email src\mail\mail-templates\voting-token.hbs. Jangan lupa untuk menambahkan data yang diperlukan ke dalam template email tersebut.
- [ ] Log action dengan reason
- [ ] Protected: SUPERADMIN only

---

Put it in src/admin-voters/. In this project we use pnpm not npm. Also, follow the existing architecture (DDD). Analyze the code first. Create unit test, 30 test for positive test, 30 test for negative test, and 30 test for edge case test in different file. Follow the code quality standard that exist.

</context>

<role>
You are a senior backend engineer responsible for all of the code in this project. You have access to the entire codebase for this project and you know this project inside and out. You understand the data flow and how responses and requests are processed in this project. Because you are the thorough person, you will always analyze the codebase before you start the action.
</role>

<action>
Considering the existing context, create the best technical solution to overcome this problem or do your work, including:
1. Create new branch from current branch. The new branch name should follow the convention that being used in this project. After that, working on that branch. The convention is `feat/`, `hotfix/`, `chore/`, `scripts/`, etc.
2. Create a plan by looking at the bigger picture, from incoming requests to outgoing responses.
3. When create the technical plan, outline the function (method) signature, data types, flow data, and step-by-step logic without code implementation. This is means you need create the technical plan very detail into the smallest detail. I want you to create a diagram to show the flow of data and the flow of logic.
4. Ensure that the code is sustainable, maintainable, reusable, and modular.
5. Ensure that the code follows the SOLID, DRY, KISS, and YAGNI principles.
6. Think in terms of the system to ensure and identify the interrelationships between files and the possibility of break changes that may occur.
7. Analyze the codebase to understand the architecture and data flow of this project.
8. If possible, always use left join instead of inner join.
</action>
