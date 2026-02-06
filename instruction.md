<context>
We will execute the task below

**Description:**
Service untuk hitung hasil voting dan cache hasilnya.

**Acceptance Criteria:**

- [ ] `ResultsService` dibuat dengan method `calculateResults()`:
  - Query `votes` table, GROUP BY `candidate_id`
  - COUNT votes per candidate
  - Hitung percentage masing-masing
  - Determine winner (highest vote count)
- [ ] `GET /api/v1/superadmin/results/preview` — return calculated results
  - Hanya bisa diakses ketika election status `CLOSED`
- [ ] Protected: SUPERADMIN only

---

**Description:**
Endpoint untuk verify integrity semua votes sebelum publish.

**Acceptance Criteria:**

- [ ] `POST /api/v1/superadmin/results/verify` — trigger verification
- [ ] Logic:
  1. Ambil semua votes dari tabel `votes`
  2. Untuk setiap vote, recalculate hash: `SHA256(voter_uuid + candidate_id + voted_at + salt)`
  3. Compare dengan `vote_hash` yang tersimpan
  4. Jika semua match → status `PASS`
  5. Jika ada yang tidak match → status `FAIL`, return list vote IDs yang corrupted
- [ ] Return: `{ status: 'PASS' | 'FAIL', totalVerified, corruptedVotes?: [id] }`
- [ ] Log verification action
- [ ] Protected: SUPERADMIN only

---

**Description:**
Endpoint untuk publish results ke publik setelah superadmin approve.

**Acceptance Criteria:**

- [ ] `POST /api/v1/superadmin/results/publish`
- [ ] Validasi:
  - Election status harus `CLOSED`
  - Hash verification harus sudah dijalankan dan hasilnya `PASS` (bisa simpan last verification status)
- [ ] Update election status ke `PUBLISHED`
- [ ] Set `results_published_at` timestamp
- [ ] Log action
- [ ] Protected: SUPERADMIN only

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
