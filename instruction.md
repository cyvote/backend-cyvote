<context>
We will execute the task below

Integrasikan email service (Mailtrap) dan buat email sending utility.

**Acceptance Criteria:**

- [ ] Mailtrap properties dikonfigurasi via env variable
- [ ] `EmailService` dibuat sebagai injectable NestJS service
- [ ] Method `sendEmail({ to, subject, htmlBody })` tersedia
- [ ] Retry logic: jika send gagal, retry sampai 3x dengan delay
- [ ] Delivery status di-log ke `audit_logs`
- [ ] Email template dasar untuk token (HTML template, bukan plain text)
- [ ] Test kirim email ke address real berhasil

**Email Template Variables:**

- `{{ nama }}` — Nama pemilih
- `{{ nim }}` — NIM pemilih
- `{{ token }}` — Token voting
- `{{ end_date }}` — Tanggal berakhir voting
- `{{ end_time }}` — Jam berakhir voting (WIB)

This is the mailtrap properties
Credentials
Manage Credentials
Host

bulk.smtp.mailtrap.io
Port

587 (recommended), 465, 2525 or 25
Username

apismtp@mailtrap.io
Password
5e37789514a5ace91674defdc98dab40

Auth

PLAIN, LOGIN
TLS

Required. STARTTLS on ports 587, 2525 and 25. Forced TLS on port 465.

We will try to send to following emails (bulk)

- nugrahaadhitama22@gmail.com
- 2210512109@mahasiswa.upnvj.ac.id

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
