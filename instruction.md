<context>
We will execute the task below

**Description:**
Endpoint untuk export list pemilih yang belum voting sebagai CSV.

**Acceptance Criteria:**

- [ ] `GET /api/admin/voters/export/non-voters` — return CSV file
- [ ] CSV columns: `NIM,Nama,Angkatan,Email`
- [ ] Only return voters where `has_voted = false` dan `deleted_at IS NULL`
- [ ] Response header: `Content-Type: text/csv`, `Content-Disposition: attachment`
- [ ] Action di-log
- [ ] Protected: ADMIN only
- [ ] Nama file CSV haruslah `TIMESTAMP-non-voters.csv`. Untuk timestampnya itu cukup tanggal, bulan, tahun, jam, menit, detik saja waktu WIB.

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
