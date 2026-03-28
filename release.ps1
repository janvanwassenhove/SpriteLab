# SpriteLab Release Script
# Automates version bumping, build verification, Docker image tagging, and git release creation.
param(
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild,

    [Parameter(Mandatory=$false)]
    [switch]$SkipLint,

    [Parameter(Mandatory=$false)]
    [switch]$SkipScreenshots,

    [Parameter(Mandatory=$false)]
    [switch]$SkipDocker,

    [Parameter(Mandatory=$false)]
    [switch]$SkipPush,

    [Parameter(Mandatory=$false)]
    [switch]$Help
)

if ($Help) {
    Write-Host @"
SpriteLab Release Script

Usage:
    .\release.ps1 [-SkipBuild] [-SkipLint] [-SkipScreenshots] [-SkipDocker] [-SkipPush] [-Help]

Parameters:
    -SkipBuild        : Skip Next.js production build verification
    -SkipLint         : Skip TypeScript type-check and ESLint
    -SkipScreenshots  : Skip Playwright screenshot capture
    -SkipDocker       : Skip Docker image build
    -SkipPush         : Don't push to remote repository
    -Help             : Show this help message

Examples:
    .\release.ps1                          # Full release workflow
    .\release.ps1 -SkipDocker              # Skip Docker build
    .\release.ps1 -SkipScreenshots         # Skip screenshot capture
    .\release.ps1 -SkipBuild -SkipDocker   # Quick: just bump, tag & push
    .\release.ps1 -SkipPush                # Local release only (no push)

What happens:
    1. Validates prerequisites (Node.js, npm, git, clean working tree)
    2. Prompts for the new version number
    3. Runs TypeScript type-check and ESLint (unless -SkipLint)
    4. Updates version in package.json
    5. Runs 'npm run build' to verify the production build (unless -SkipBuild)
    6. Captures application screenshots via Playwright (unless -SkipScreenshots)
    7. Builds Docker image tagged with version (unless -SkipDocker)
    8. Commits the version change and creates a git tag (v<version>)
    9. Pushes commit + tag to GitHub (unless -SkipPush)
"@
    exit 0
}

# ─── Banner ──────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "         SpriteLab Release Script" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# ─── Pre-flight checks ──────────────────────────────────────────────────────

# Git repository check
try {
    git rev-parse --git-dir 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    Write-Host "ERROR: Not in a git repository!" -ForegroundColor Red
    exit 1
}

# Clean working directory check
$status = git status --porcelain 2>$null
if ($status) {
    Write-Host "ERROR: Working directory is not clean. Commit or stash changes first." -ForegroundColor Red
    Write-Host ""
    git status --short
    exit 1
}

# Required tools
$requiredTools = @("node", "npm")
foreach ($tool in $requiredTools) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: '$tool' is not installed or not in PATH!" -ForegroundColor Red
        exit 1
    }
}

if (-not $SkipDocker) {
    if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
        Write-Host "WARNING: Docker not found. Skipping Docker build." -ForegroundColor Yellow
        $SkipDocker = $true
    }
}

# Verify package.json exists
$packageJsonPath = "package.json"
if (-not (Test-Path $packageJsonPath)) {
    Write-Host "ERROR: package.json not found! Run this script from the project root." -ForegroundColor Red
    exit 1
}

# ─── Version prompt ─────────────────────────────────────────────────────────

$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version

Write-Host "Current version: $currentVersion" -ForegroundColor Yellow
Write-Host ""

do {
    $Version = Read-Host "Enter new version (e.g., 0.2.0, 1.0.0)"
} while (-not $Version)

if ($Version -notmatch '^[0-9]+\.[0-9]+\.[0-9]+$') {
    Write-Host "ERROR: Invalid version format! Use semantic versioning (e.g., 1.0.0)" -ForegroundColor Red
    exit 1
}

$existingTag = git tag -l "v$Version" 2>$null
if ($existingTag) {
    Write-Host "ERROR: Tag v$Version already exists!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Preparing release v$Version..." -ForegroundColor Green
Write-Host ""

# ─── Backup & restore helper ────────────────────────────────────────────────

Copy-Item $packageJsonPath "$packageJsonPath.backup" -Force

function Restore-Backup {
    if (Test-Path "$packageJsonPath.backup") {
        Copy-Item "$packageJsonPath.backup" $packageJsonPath -Force
        Remove-Item "$packageJsonPath.backup" -Force
    }
    Write-Host "Backup restored. Fix the issues and try again." -ForegroundColor Yellow
    exit 1
}

# ─── Update version ─────────────────────────────────────────────────────────

Write-Host "[1/7] Updating package.json version to $Version..." -ForegroundColor Yellow
$packageJson.version = $Version
$packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath

try {
    # ─── Lint & type-check ───────────────────────────────────────────────────

    if (-not $SkipLint) {
        Write-Host "[2/7] Running TypeScript type-check..." -ForegroundColor Yellow
        npx tsc --noEmit
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: TypeScript type-check failed!" -ForegroundColor Red
            Restore-Backup
        }
        Write-Host "  Type-check passed." -ForegroundColor Green

        Write-Host "[2/7] Running ESLint..." -ForegroundColor Yellow
        npm run lint -- --max-warnings 50
        if ($LASTEXITCODE -ne 0) {
            Write-Host "WARNING: ESLint reported issues (see above). Continuing..." -ForegroundColor Yellow
        } else {
            Write-Host "  Lint passed." -ForegroundColor Green
        }
    } else {
        Write-Host "[2/7] Skipping lint (-SkipLint)." -ForegroundColor DarkGray
    }

    # ─── Next.js build ───────────────────────────────────────────────────────

    if (-not $SkipBuild) {
        Write-Host ""
        Write-Host "[3/7] Building Next.js production bundle..." -ForegroundColor Yellow
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Next.js build failed!" -ForegroundColor Red
            Restore-Backup
        }
        Write-Host "  Build successful." -ForegroundColor Green
    } else {
        Write-Host "[3/7] Skipping build (-SkipBuild)." -ForegroundColor DarkGray
    }

    # ─── Screenshots ─────────────────────────────────────────────────────────

    if (-not $SkipScreenshots) {
        Write-Host ""
        Write-Host "[4/7] Capturing application screenshots..." -ForegroundColor Yellow

        # Check if Playwright is installed
        $playwrightInstalled = $false
        try {
            npx playwright --version 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) { $playwrightInstalled = $true }
        } catch {}

        if ($playwrightInstalled) {
            # Start dev server in background, capture screenshots, then stop it
            $devProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden
            Write-Host "  Waiting for dev server..." -ForegroundColor DarkGray
            Start-Sleep -Seconds 8

            # Try to hit the server
            $serverReady = $false
            for ($i = 0; $i -lt 15; $i++) {
                try {
                    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
                    if ($response.StatusCode -eq 200) { $serverReady = $true; break }
                } catch {}
                Start-Sleep -Seconds 2
            }

            if ($serverReady) {
                npm run screenshots 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  Screenshots captured to docs/screenshots/." -ForegroundColor Green
                    # Stage the screenshots so they are included in the release commit
                    git add docs/screenshots/*.png 2>$null
                } else {
                    Write-Host "  WARNING: Screenshot capture had errors. Continuing..." -ForegroundColor Yellow
                }
            } else {
                Write-Host "  WARNING: Dev server did not start. Skipping screenshots." -ForegroundColor Yellow
            }

            # Stop the dev server
            if ($devProcess -and -not $devProcess.HasExited) {
                Stop-Process -Id $devProcess.Id -Force -ErrorAction SilentlyContinue
            }
            # Also kill any orphaned next-server processes
            Get-Process -Name "node" -ErrorAction SilentlyContinue |
                Where-Object { $_.MainWindowTitle -eq "" } |
                ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
        } else {
            Write-Host "  WARNING: Playwright not installed. Run 'npm run screenshots:install' to enable." -ForegroundColor Yellow
            Write-Host "  Skipping screenshot capture." -ForegroundColor DarkGray
        }
    } else {
        Write-Host "[4/7] Skipping screenshots (-SkipScreenshots)." -ForegroundColor DarkGray
    }

    # ─── Docker build ────────────────────────────────────────────────────────

    if (-not $SkipDocker) {
        Write-Host ""
        Write-Host "[5/7] Building Docker image spritelab:$Version..." -ForegroundColor Yellow
        docker build -t "spritelab:$Version" -t "spritelab:latest" -f docker/Dockerfile .
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Docker build failed!" -ForegroundColor Red
            Restore-Backup
        }
        Write-Host "  Docker image built: spritelab:$Version" -ForegroundColor Green
    } else {
        Write-Host "[5/7] Skipping Docker build (-SkipDocker)." -ForegroundColor DarkGray
    }

    # ─── Git commit & tag ────────────────────────────────────────────────────

    Write-Host ""
    Write-Host "[6/7] Creating git commit and tag..." -ForegroundColor Yellow
    git add $packageJsonPath
    git commit -m "Release v$Version"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Git commit failed!" -ForegroundColor Red
        Restore-Backup
    }

    git tag -a "v$Version" -m "Release v$Version"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Git tag creation failed!" -ForegroundColor Red
        Restore-Backup
    }
    Write-Host "  Tag v$Version created." -ForegroundColor Green

    # ─── Push ────────────────────────────────────────────────────────────────

    if (-not $SkipPush) {
        Write-Host ""
        Write-Host "[7/7] Pushing to remote..." -ForegroundColor Yellow
        $pushChoice = Read-Host "Push commit and tag to origin? (y/n)"
        if ($pushChoice -eq "y" -or $pushChoice -eq "Y") {
            git push origin main
            if ($LASTEXITCODE -ne 0) {
                Write-Host "WARNING: Failed to push commits." -ForegroundColor Yellow
            }
            git push origin "v$Version"
            if ($LASTEXITCODE -ne 0) {
                Write-Host "WARNING: Failed to push tag." -ForegroundColor Yellow
            }
            Write-Host "  Pushed to origin." -ForegroundColor Green
        } else {
            Write-Host "  Skipped push (user declined)." -ForegroundColor DarkGray
        }
    } else {
        Write-Host "[7/7] Skipping push (-SkipPush)." -ForegroundColor DarkGray
    }

    # ─── Cleanup ─────────────────────────────────────────────────────────────

    Remove-Item "$packageJsonPath.backup" -Force -ErrorAction SilentlyContinue

    # ─── Summary ─────────────────────────────────────────────────────────────

    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host "  SUCCESS! SpriteLab v$Version released!" -ForegroundColor Green
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Version updated: package.json" -ForegroundColor White
    Write-Host "  Git tag created: v$Version" -ForegroundColor White

    if (-not $SkipDocker) {
        Write-Host "  Docker image:    spritelab:$Version" -ForegroundColor White
    }

    Write-Host ""

    if ($SkipPush -or $pushChoice -ne "y") {
        Write-Host "To push manually:" -ForegroundColor Yellow
        Write-Host "  git push origin main" -ForegroundColor White
        Write-Host "  git push origin v$Version" -ForegroundColor White
    } else {
        Write-Host "Release page:" -ForegroundColor Yellow
        Write-Host "  https://github.com/janvanwassenhove/SpriteLab/releases/tag/v$Version" -ForegroundColor Cyan
    }

    Write-Host ""

} catch {
    Write-Host "ERROR: An unexpected error occurred: $_" -ForegroundColor Red
    Restore-Backup
}
