<context>
We will execute the task below

**Description:**
Endpoint CRUD untuk manajemen kandidat beserta upload file.

**Acceptance Criteria:**

- [ ] `POST /api/v1/admin/candidates` — create candidate
  - Terima: nama, visi_misi, program_kerja, photo (file), grand_design (file)
  - Upload photo ke Supabase Storage (max 2MB, JPG/PNG)
  - Upload grand_design ke Supabase Storage (max 10MB, PDF only)
  - Validasi: visi_misi max 2000 chars, program_kerja max 3000 chars
  - Sanitize HTML dari visi_misi dan program_kerja
- [ ] `GET /api/v1/admin/candidates` — list semua candidates
- [ ] `GET /api/v1/candidates` — public endpoint untuk voter (return data yang sama)
- [ ] `GET /api/v1/candidates/:id` — detail satu candidate (public)
- [ ] `PUT /api/v1/admin/candidates/:id` — update candidate
  - Tidak bisa edit jika voting sudah aktif
  - Jika photo/PDF baru di-upload, delete file lama dari storage
- [ ] `DELETE /api/v1/admin/candidates/:id` — delete candidate
  - Tidak bisa delete jika voting sudah dimulai
  - Delete file dari storage juga
- [ ] Semua mutation endpoint protected: ADMIN only
- [ ] Semua action di-log

Berikut detail supabasenya

```
SUPABASE_SECRET_KEYS=sb_secret_t1sWm2dN44TGnZI0G7B27Q_M-LBuxsz
SUPABASE_PROJECT_URL-https://ytdkbqslvnivtdycfwom.supabase.co
```

Jadi nanti yang disimpan ke dalam database kita hanya link file dari supabase saja. Oh iya, untuk supabase storage, aku sudah membuat bucket-nya yaitu `uploads`. Untuk yang foto kandidat aku sudah membuat folder di dalam bucket tersebut dengan nama `candidates_profile_photo` sehingga nant untuk profil kandidat kita taruh di sana. Lalu, untuk grand design itu aku belum membuat foldernya, jadi nanti aku ingin dicek dulu apakah ada folder `grand_designs` atau tidak. Jika tidak, buat dulu, kalau sudah ada gausah dibuat. Untuk file grand design akan ditaruh di folder tersebut.

Kedua key itu dimasukkan ke dalam file env-example-document dan env-example-relational saja. Nanti biar aku yang masukin ke .env dan .env.production.

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
