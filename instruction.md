<context>
We will create the migrations file for the following tables. We will create each table with its own file. After create the migration file, we will run it. We use pnpm and not npm.

```sql
-- Voters Table
CREATE TABLE voters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nim VARCHAR(15) UNIQUE NOT NULL,
  nama_lengkap VARCHAR(100) NOT NULL,
  angkatan INTEGER NOT NULL,
  email VARCHAR(255) NOT NULL,
  has_voted BOOLEAN DEFAULT FALSE,
  voted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Candidates Table
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(100) NOT NULL,
  photo_url VARCHAR(500),
  visi_misi TEXT,
  program_kerja TEXT,
  grand_design_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tokens Table
CREATE TABLE tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id UUID REFERENCES voters(id),
  token_hash VARCHAR(64) NOT NULL, -- Hashed token
  generated_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP,
  is_used BOOLEAN DEFAULT FALSE,
  resend_count INTEGER DEFAULT 0
);

-- Votes Table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id UUID REFERENCES voters(id),
  candidate_id UUID REFERENCES candidates(id),
  vote_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
  voted_at TIMESTAMP DEFAULT NOW(),
  receipt_code VARCHAR(20) UNIQUE NOT NULL
);

-- Vote Hashes (for integrity verification)
CREATE TABLE vote_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID REFERENCES votes(id),
  hash VARCHAR(64) NOT NULL,
  verification_hash VARCHAR(64), -- For double-verification
  created_at TIMESTAMP DEFAULT NOW()
);

-- Admins Table
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL, -- 'ADMIN' or 'SUPERADMIN'
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Election Config Table
CREATE TABLE election_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'SCHEDULED', -- SCHEDULED, ACTIVE, CLOSED, PUBLISHED
  results_published_at TIMESTAMP,
  created_by UUID REFERENCES admins(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID, -- Can be voter_id or admin_id
  actor_type VARCHAR(20), -- 'VOTER', 'ADMIN', 'SUPERADMIN', 'SYSTEM'
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(20), -- 'SUCCESS', 'FAILURE'
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_voters_nim ON voters(nim);
CREATE INDEX idx_voters_has_voted ON voters(has_voted);
CREATE INDEX idx_tokens_voter ON tokens(voter_id);
CREATE INDEX idx_votes_voter ON votes(voter_id);
CREATE INDEX idx_votes_candidate ON votes(candidate_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, actor_type);
```

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
