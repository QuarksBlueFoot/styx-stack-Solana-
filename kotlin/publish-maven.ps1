# Styx Kotlin SDK - Maven Central Publishing (Central Portal API)
# Run from kotlin/ directory: .\publish-maven.ps1 -Version "1.1.0"

param(
    [string]$Version = "1.1.0"
)

Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║     Publishing Styx Kotlin SDK v$Version (Central Portal)    ║
╚══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Trigger GitHub Actions workflow
Write-Host "📋 Triggering GitHub Actions workflow..." -ForegroundColor Yellow
gh workflow run publish-maven.yml -f version="$Version" -f publishingType="USER_MANAGED"

Start-Sleep -Seconds 5

# Get the latest run ID
$runInfo = gh run list --workflow=publish-maven.yml --limit 1 --json databaseId | ConvertFrom-Json
$runId = $runInfo[0].databaseId

Write-Host "🔗 Workflow started: https://github.com/QuarksBlueFoot/styx-stack-Solana-/actions/runs/$runId" -ForegroundColor Green

Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║                    📋 NEXT STEPS                             ║
╠══════════════════════════════════════════════════════════════╣
║  Publishing via Sonatype Central Portal API                  ║
║                                                              ║
║  The CI workflow will:                                       ║
║    1. Build & sign all modules                               ║
║    2. Stage artifacts locally                                ║
║    3. Create deployment bundle (ZIP)                         ║
║    4. Upload to Central Portal API                           ║
║    5. Monitor deployment status                              ║
║                                                              ║
║  If publishingType = USER_MANAGED:                           ║
║    - Go to https://central.sonatype.com                      ║
║    - Login with token name: NEXUS                            ║
║    - Find your deployment                                    ║
║    - Click 'Publish' to release to Maven Central             ║
║                                                              ║
║  If publishingType = AUTOMATIC:                              ║
║    - Auto-released after validation passes                   ║
║                                                              ║
║  Secret required in GitHub repo:                             ║
║    CENTRAL_PORTAL_TOKEN = base64(username:password)          ║
║                                                              ║
║  Verify on Maven Central (after ~30 min):                    ║
║    https://repo1.maven.org/maven2/nexus/styx/                ║
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

Write-Host "Monitor workflow: gh run watch $runId" -ForegroundColor Yellow
