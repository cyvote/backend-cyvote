<context>
Teradapat sebuah bug ketika aku sedang melakukan testing untuk resend token. Bug ini terjadi ketika aku sedang melakukan scenario testing di bawah ini.

1. Aku login sebagai superadmin dan kemudian pengatur pemilihan (election config) dimulai pada tanggal 15 Februari pukul 11.36 WIB.
2. Pada tanggal 15 Februari pukul 11.36 WIB, statu pemilihan berubah menjadi ACTIVE dan semua token dikirim ke email voters.
3. Aku sebagai voters dengan NIM 2210512109@mahasiswa.upnvj.ac.id. Sengaja menghapus email tersebut untuk melaksanakan skenario testing.
4. Kemudian, aku sebagai superadmin mengirim ulang token ke email voters. Di admin panel.
5. Token tersebut berhasil terkirim. Namun, di sini bugnya terjadi, ketika email tersebut berhasil terkirim, seharusnya aku sebagai admin melihat bahwa aku baru saja mengirimkan token ulang ke voters tersebut sebanyak 1 kali. Namun, ternyata yang tercatat adalah aku mengirimkan token ulang ke voters tersebut sebanyak 2 kali. Tapi, token yang terkirim hanya satu kali. Hal ini menyebabkan batas pengiriman token yang seharusnya 1/3 menjadi 2/3.
6. Ketika aku ingin mengirimkan token ulang lagi ke user yang sama. Itu malah menjadi 4/3. Bug nya terjadi seolah-olah 2 kali mengirimkan token ulang (bukan token awal ketika pemilihan dimulai).

Let's fix this bug. Kita hanya akan fokus memperbaiki bug ini dan tidak akan menyentuh hal-hal lainnya.
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
