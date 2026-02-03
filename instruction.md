<context>
We will execute the task below

**Description:**
Implementasikan rate limiting dan security middleware yang akan digunakan di seluruh API.

**Acceptance Criteria:**

- [ ] Rate limiter menggunakan in-memory store (cukup untuk skala ini)
- [ ] Login endpoint: max 5 attempts per 10 menit per IP
- [ ] Token verification endpoint: max 3 attempts per 5 menit per session/IP
- [ ] Global API rate limit: 100 requests per menit per IP
- [ ] Jika rate limit terlampaui, return `429 Too Many Requests` dengan `Retry-After` header
- [ ] Helmet.js dikonfigurasi untuk security headers (CSP, XSS protection, etc.)
- [ ] CSRF protection di-setup
- [ ] IP address di-extract dari request (handle behind proxy)

---

We will use winston for the logger service. In this project we use pnpm not npm. Also, follow the existing architecture (DDD). Analyze the code first. Create unit test, 30 test for positive test, 30 test for negative test, and 30 test for edge case test. Follow the code quality standard that exist.

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
