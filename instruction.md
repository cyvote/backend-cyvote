<context>
We will execute the task below

**Description:**
Service untuk generate token untuk semua voters dan schedule pengiriman email.

**Acceptance Criteria:**

- [ ] `TokenGenerationService` dibuat sebagai injectable service
- [ ] Method `generateAllTokens()`:
  - Ambil semua voters yang belum punya token
  - Untuk setiap voter: generate 8 char alphanumeric token, pastikan unique
  - Hash token dengan SHA-256 sebelum simpan ke database
  - Simpan ke tabel `tokens`
- [ ] Method `scheduleTokenEmails()`:
  - Ambil semua tokens yang belum dikirim
  - Batch per 50 emails/batch queue
  - Kirim pakai `EmailService`
  - Delay 150 detik antar batch
  - Log delivery status setiap email
  - Retry failed sends (max 3x)
  - Kita akan menggunakan email template yang sudah ada di src\mail\mail-templates\voting-token.hbs.
- [ ] Token ini harus di-trigger 10–15 menit sebelum `start_date` dari election config
  - Implementasi sebagai scheduled job yang cek setiap menit apakah sudah waktunya
- [ ] Log semua token generation events

---

**Description:**
Endpoint untuk admin resend token ke voter tertentu.

**Acceptance Criteria:**

- [ ] `POST /api/v1/admin/voters/:id/resend-token`
- [ ] Validasi:
  - Voter harus ada
  - `resend_count` harus < 3
  - Election status harus `ACTIVE`
  - Token belum digunakan
- [ ] Kirim email langsung (tidak batched) pakai `EmailService`
- [ ] Increment `resend_count` di tabel tokens
- [ ] Jika resend_count sudah 3, return error: "Resend token sudah mencapai batas maksimum"
- [ ] Log action dengan admin_id
- [ ] Protected: ADMIN only

---

Put it in src/{kamu tentukan nama modulenya}/. In this project we use pnpm not npm. Also, follow the existing architecture (DDD). Analyze the code first. Follow the code quality standard that exist.

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
