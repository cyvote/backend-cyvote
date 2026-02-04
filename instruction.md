<context>
We will execute the task below

**Description:**
Endpoint untuk superadmin query dan export audit logs.

**Acceptance Criteria:**

- [ ] `GET /api/v1/superadmin/logs` — paginated query
  - Query params: `page`, `limit`, `dateFrom`, `dateTo`, `action` (enum), `actorType`, `ip`, `search` (actor_id)
  - Return: `{ data: [...logs], total, page, limit }`
  - Default sort: created_at DESC
- [ ] `GET /api/v1/superadmin/logs/export` — export sebagai CSV
  - Apply filter yang sama dari query params
  - Response: CSV file download
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
