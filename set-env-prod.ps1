
# -------------------------------------------------------------------------
# Set-Env.ps1
# Automating GitHub Secrets and Variables Import for cyvote/backend-cyvote
# -------------------------------------------------------------------------

$Repo = "cyvote/backend-cyvote"
$EnvName = "Production"

# Helper for Secrets (Sensitive Data)
function Set-Secret {
    param ([string]$Name, [string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) {
        Write-Host "[-] Skipping SECRET $Name (Value is empty)" -ForegroundColor DarkGray
        return
    }
    Write-Host "[*] Setting SECRET $Name (Env: $EnvName)..." -NoNewline
    # Use Invoke-Expression or direct call. Direct call is safer.
    # We pipe the body to handle special characters better if needed, but --body is fine for simple strings.
    # Note: Using --repo to avoid interactive prompts.
    echo $Value | gh secret set $Name --env $EnvName --repo $Repo
    if ($?) { Write-Host " OK" -ForegroundColor Green } else { Write-Host " FAIL" -ForegroundColor Red }
}

# Helper for Variables (Configuration)
function Set-Variable {
    param ([string]$Name, [string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) {
        Write-Host "[-] Skipping VARIABLE $Name (Value is empty)" -ForegroundColor DarkGray
        return
    }
    Write-Host "[*] Setting VARIABLE $Name (Env: $EnvName)..." -NoNewline
    # gh variable set creates or updates.
    gh variable set $Name --body "$Value" --env $EnvName --repo $Repo
    if ($?) { Write-Host " OK" -ForegroundColor Green } else { Write-Host " FAIL" -ForegroundColor Red }
}

# --- 1. SECRETS ---
Set-Secret "DATABASE_PASSWORD" "2*JXgPehJaWX9-a"
Set-Secret "SECRET_ACCESS_KEY" ""
Set-Secret "MAIL_PASSWORD" "dfa252e670733de95a7766ab11fcbe11"
Set-Secret "AUTH_JWT_SECRET" "secret"
Set-Secret "AUTH_REFRESH_SECRET" "secret_for_refresh"
Set-Secret "AUTH_FORGOT_SECRET" "secret_for_forgot"
Set-Secret "AUTH_CONFIRM_EMAIL_SECRET" "88XswHY0O0yZ1FUJm910lOcA0y9hnSX3"
Set-Secret "AUTH_ADMIN_JWT_SECRET" "ca88b4b7b0d234dc4dd724ccb68a5680"
Set-Secret "FACEBOOK_APP_SECRET" ""
Set-Secret "GOOGLE_CLIENT_SECRET" ""
Set-Secret "SECURITY_CSRF_SECRET" "MjwuD7Uk5r8WOgIfNgU1rCYLx8emJ8o3"
Set-Secret "SUPABASE_SECRET_KEY" "sb_secret_n3n9EyWfwaOmhuBt-6TE3A_oagI3Kwy"
Set-Secret "VOTE_HASH_SALT" "lXxUsgOPjkruE6PG1zA703CfjT9oVAo3pJN0rwMLQM7HkZGyoU"

# --- 2. VARIABLES ---
Set-Variable "NODE_ENV" "production"
Set-Variable "APP_PORT" "3022"
Set-Variable "APP_NAME" "Cyvote"
Set-Variable "API_PREFIX" "api"
Set-Variable "APP_FALLBACK_LANGUAGE" "en"
Set-Variable "APP_HEADER_LANGUAGE" "x-custom-lang"
Set-Variable "FRONTEND_DOMAIN" "http://localhost:3011,http://localhost:3012,https://admin.cyvote.cybersecurityupnvj.com/,https://user.cyvote.cybersecurityupnvj.com/"
Set-Variable "BACKEND_DOMAIN" "https://api.cyvote.cybersecurityupnvj.com"
Set-Variable "DATABASE_TYPE" "postgres"
Set-Variable "DATABASE_HOST" "aws-1-ap-northeast-2.pooler.supabase.com"
Set-Variable "DATABASE_PORT" "6543"
Set-Variable "DATABASE_USERNAME" "postgres.owfjuqdjkgtebjhvwmhy"
# DATABASE_PASSWORD is a SECRET
Set-Variable "DATABASE_NAME" "postgres"
Set-Variable "DATABASE_SYNCHRONIZE" "false"
Set-Variable "DATABASE_MAX_CONNECTIONS" "10"
Set-Variable "DATABASE_SSL_ENABLED" "true"
Set-Variable "DATABASE_REJECT_UNAUTHORIZED" "false"
Set-Variable "DATABASE_CA" ""
Set-Variable "DATABASE_KEY" ""
Set-Variable "DATABASE_CERT" ""
Set-Variable "DATABASE_URL" ""
Set-Variable "FILE_DRIVER" "local"
Set-Variable "ACCESS_KEY_ID" ""
# SECRET_ACCESS_KEY is a SECRET
Set-Variable "AWS_S3_REGION" ""
Set-Variable "AWS_DEFAULT_S3_BUCKET" ""
Set-Variable "MAIL_HOST" "bulk.smtp.mailtrap.io"
Set-Variable "MAIL_PORT" "587"
Set-Variable "MAIL_USER" "smtp@mailtrap.io"
# MAIL_PASSWORD is a SECRET
Set-Variable "MAIL_IGNORE_TLS" "false"
Set-Variable "MAIL_SECURE" "false"
Set-Variable "MAIL_REQUIRE_TLS" "true"
Set-Variable "MAIL_DEFAULT_EMAIL" "noreply@mail.cylink.id"
Set-Variable "MAIL_DEFAULT_NAME" "CyVote E-Voting System"
Set-Variable "MAIL_CLIENT_PORT" "1080"
# AUTH_JWT_SECRET is a SECRET
Set-Variable "AUTH_JWT_TOKEN_EXPIRES_IN" "15m"
# AUTH_REFRESH_SECRET is a SECRET
Set-Variable "AUTH_REFRESH_TOKEN_EXPIRES_IN" "3650d"
# AUTH_FORGOT_SECRET is a SECRET
Set-Variable "AUTH_FORGOT_TOKEN_EXPIRES_IN" "30m"
# AUTH_CONFIRM_EMAIL_SECRET is a SECRET
Set-Variable "AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN" "1d"
# AUTH_ADMIN_JWT_SECRET is a SECRET
Set-Variable "AUTH_ADMIN_JWT_TOKEN_EXPIRES_IN" "2h"
Set-Variable "AUTH_ADMIN_BCRYPT_COST" "12"
Set-Variable "FACEBOOK_APP_ID" ""
# FACEBOOK_APP_SECRET is a SECRET
Set-Variable "GOOGLE_CLIENT_ID" ""
# GOOGLE_CLIENT_SECRET is a SECRET
Set-Variable "APPLE_APP_AUDIENCE" "[]"
Set-Variable "AUDIT_LOG_ENABLED" "true"
Set-Variable "AUDIT_LOG_LEVEL" "info"
Set-Variable "AUDIT_LOG_CONSOLE_ENABLED" "true"
Set-Variable "AUDIT_LOG_FILE_ENABLED" "false"
Set-Variable "AUDIT_LOG_FILE_PATH" "./logs"
Set-Variable "AUDIT_LOG_MAX_FILES" "30d"
Set-Variable "AUDIT_LOG_MAX_SIZE" "20m"
Set-Variable "AUDIT_LOG_DATABASE_ENABLED" "true"
Set-Variable "SECURITY_RATE_LIMIT_GLOBAL_TTL" "60"
Set-Variable "SECURITY_RATE_LIMIT_GLOBAL_LIMIT" "100"
Set-Variable "SECURITY_RATE_LIMIT_LOGIN_TTL" "600"
Set-Variable "SECURITY_RATE_LIMIT_LOGIN_LIMIT" "5"
Set-Variable "SECURITY_RATE_LIMIT_TOKEN_VERIFY_TTL" "60"
Set-Variable "SECURITY_RATE_LIMIT_TOKEN_VERIFY_LIMIT" "3"
Set-Variable "SECURITY_RATE_LIMIT_CLEANUP_INTERVAL" "60000"
Set-Variable "SECURITY_HELMET_ENABLED" "true"
Set-Variable "SECURITY_CSRF_ENABLED" "true"
# SECURITY_CSRF_SECRET is a SECRET
Set-Variable "SECURITY_CSRF_COOKIE_NAME" "csrf-token"
Set-Variable "SECURITY_CSRF_HEADER_NAME" "x-csrf-token"
Set-Variable "SECURITY_CSRF_TTL" "3600"
Set-Variable "SECURITY_IP_TRUST_PROXY" "true"
Set-Variable "SECURITY_IP_PROXY_HEADERS" "[x-forwarded-for,x-real-ip]"
Set-Variable "WORKER_HOST" "redis://redis:6379/1"
# SUPABASE_SECRET_KEY is a SECRET
Set-Variable "SUPABASE_PROJECT_URL" "https://owfjuqdjkgtebjhvwmhy.supabase.co"
# VOTE_HASH_SALT is a SECRET

Write-Host "Done! All non-empty secrets and variables set." -ForegroundColor Green
