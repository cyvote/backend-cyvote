<context>
We will execute the task below

In the current cron job for generating tokens and sending the token email blast to voters, we configure it to run 10–15 minutes before voting begins. In addition, this cron job also performs a flagging process that prevents the system from generating tokens and sending them again because the status is already stored in memory. As a result, when the election schedule is deleted and recreated (since only ONE election schedule is allowed to exist in the database), the system can no longer generate tokens and send emails again. Furthermore, if new voter data is added outside of that 10–15 minute window, those voters do not receive their tokens via email. This happens because, as mentioned earlier, we store in memory that tokens have already been generated and emails have already been sent.

The current system is not effective. Therefore, we need to change how it works. First, we will generate tokens and send the token email blast to voters IF AND ONLY IF the election schedule status has changed to ACTIVE. If, during the election period (meaning the election status is still ACTIVE), new voters are added, their tokens will be generated immediately and sent via email. Then, in this new workflow, we will no longer use in-memory storage. Instead, we need to think of a better way to determine whether tokens have already been generated and sent (without adding a new migration). Also, make sure that whenever there is a new election configuration (since this is still in the development and testing phase and election data will often be deleted and recreated), previously generated and sent tokens will immediately become invalid, and we will generate new tokens and send them again as soon as the election status becomes ACTIVE.

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
