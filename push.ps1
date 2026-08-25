Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pushing changes to GitHub..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Add all changes
git add .

# Prompt for commit message
$commitMsg = Read-Host -Prompt "Enter your commit message"

# Commit and push
git commit -m "$commitMsg"
git push origin main

Write-Host "========================================" -ForegroundColor Green
Write-Host "Done! Your code has been pushed." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green