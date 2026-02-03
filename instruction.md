<context>
We will execute the task below

**Description:**
Implementasi login untuk admin dan superadmin dengan JWT Token.

**Acceptance Criteria:**

- [ ] `POST /api/v1/auth/admin/login` — terima `{ username, password }`, return JWT token
- [ ] Password di-hash dengan bcrypt (cost factor 12) saat seed
- [ ] JWT token berisi: `{ id, username, role }` — signed dengan secret dari env
- [ ] Token expiry: 2 jam
- [ ] Jika login gagal, return `401` dengan message generic (jangan reveal username/password mana yang salah)
- [ ] Login success/fail di-log ke audit_logs
- [ ] `AuthGuard` (NestJS guard) dibuat untuk protect admin routes
- [ ] `RolesGuard` dibuat untuk differentiate ADMIN vs SUPERADMIN access

---

Put it in src/auth-admin/.In this project we use pnpm not npm. Also, follow the existing architecture (DDD). Analyze the code first. Create unit test, 30 test for positive test, 30 test for negative test, and 30 test for edge case test. Follow the code quality standard that exist. Also, create the seed file for admin and superadmin. Default password for admin is `admin123` and for superadmin is `superadmin123`. For admin we create 5 users and for superadmin we create 3 users.

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
