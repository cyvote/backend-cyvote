<context>
We will execute the task below

**Description:**
Endpoint utama untuk pemilih melakukan vote. Ini yang paling critical di seluruh sistem.

**Acceptance Criteria:**

- [ ] `POST /api/v1/vote` — terima `{ candidate_id }` dari authenticated voter
- [ ] Validasi chain (urutan penting):
  1. Voter harus authenticated (JWT valid)
  2. Election status harus `ACTIVE`
  3. Candidate harus exist di database
  4. Voter belum pernah voting (`has_voted = false`) — double-check di DB level
- [ ] Jika semua validasi pass, jalankan **dalam satu database transaction:**
  1. Insert ke tabel `votes` (voter_id, candidate_id, vote_hash, voted_at, receipt_code)
  2. Generate vote_hash: `SHA256(voter_uuid + candidate_id + timestamp + salt)`
  3. Generate receipt_code: `VOTE-{short_hash}`
  4. Insert ke tabel `vote_hashes`
  5. Update voter: `has_voted = true`, `voted_at = now()`
- [ ] Jika transaction gagal, rollback semua dan return error
- [ ] Log: **hanya** `"User with ID {uuid} has successfully voted!"` — jangan log candidate_id (LUBERJUDIL)
- [ ] Return: `{ receiptCode: "VOTE-xxxxx" }`
- [ ] Database constraint: `voter_id` di tabel `votes` harus UNIQUE (prevent double vote di DB level)
- [ ] Protected: Voter authenticated only

---

**Description:**
Endpoint untuk FE cek apakah voter sudah voting atau belum (dipakai saat voter login untuk decide redirect).

**Acceptance Criteria:**

- [ ] `GET /api/v1/vote/status` — return status voting dari authenticated voter
- [ ] Response: `{ hasVoted: boolean, receiptCode?: string }`
- [ ] Jika sudah voting, return receipt code mereka
- [ ] Protected: Voter authenticated only

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
