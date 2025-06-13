# Enhanced Cleanup Script for MeetHub Project
# This script removes unused files including SQL scripts and markdown documentation

Write-Host "Starting enhanced cleanup of unused files..." -ForegroundColor Green

# SQL files to remove
$sqlFiles = @(
    "ADD_CATEGORY_COLUMN.sql",
    "ADD_MISSING_HOSTS_AS_PARTICIPANTS.sql",
    "ALLOW_PUBLIC_PARTICIPANT_VIEWING.sql",
    "COMPREHENSIVE_RLS_FIX.sql",
    "FINAL_STORAGE_FIX.sql",
    "FIX_EVENT_ACCESS_404.sql",
    "FIX_RLS_POLICIES.sql",
    "FIX_USERS_RLS_FOR_PARTICIPANTS.sql",
    "HYBRID_CHAT_SETUP.sql",
    "MESSAGES_RLS_POLICIES.sql",
    "QUICK_FIX_REALTIME.sql",
    "REALTIME_POLICIES.sql",
    "SECURE_RLS_POLICIES.sql",
    "SIMPLE_MESSAGES_RLS.sql",
    "SIMPLE_REALTIME_SETUP.sql",
    "STORAGE_RLS_POLICIES.sql",
    "STORAGE_RLS_POLICIES_SIMPLE.sql",
    "URGENT_DATABASE_ACCESS_FIX.sql",
    "URGENT_SECURITY_FIX.sql",
    "check-event-image-urls.sql",
    "check-storage-status.sql",
    "debug-event-participants.sql",
    "fix-storage-access.sql",
    "setup-messages-table.sql",
    "simple-storage-check-1.sql",
    "simple-storage-check-2.sql",
    "simple-storage-check-3.sql",
    "simple-storage-check-4.sql",
    "test-database-access-restored.sql",
    "test-participants-query.sql"
)

# Markdown files to remove (keep README.md)
$markdownFiles = @(
    "CHAT_IMPLEMENTATION_COMPLETE.md",
    "CHAT_UX_IMPROVEMENTS.md",
    "COMPLETE_DELETE_IMPLEMENTATION.md",
    "COMPLETE_EVENT_MANAGEMENT.md",
    "DATABASE_CHAT_IMPLEMENTATION.md",
    "EDIT_EVENT_IMPLEMENTATION.md",
    "ENHANCED_IMAGE_MANAGEMENT.md",
    "FINAL_FIX_SUMMARY.md",
    "HOST_AUTO_PARTICIPATION.md",
    "HOST_INDICATORS_IMPLEMENTATION.md",
    "HOST_LEAVE_PREVENTION.md",
    "HYBRID_CHAT_COMPLETE.md",
    "HYBRID_CHAT_DEPLOYMENT.md",
    "IMPLEMENTATION_COMPLETE.md",
    "LAYOUT_UPDATE.md",
    "PARTICIPANT_COUNT_FIX_COMPLETE.md",
    "PARTICIPANT_COUNT_FIX_SUMMARY.md",
    "PENDING_STATUS_IMPLEMENTATION_COMPLETE.md",
    "PROJECT_STATUS.md",
    "QUICK_FIX_STORAGE.md",
    "REALTIME_DELETE_UPDATE_COMPLETE.md",
    "REALTIME_TROUBLESHOOTING.md",
    "RLS_POLICY_CORRECTION.md",
    "RLS_POLICY_FIX_COMPLETE.md",
    "SECURE_RLS_COMPLETE_SOLUTION.md",
    "SECURE_RLS_IMPLEMENTATION.md",
    "SECURITY_ISSUE_ANALYSIS.md",
    "STORAGE_SETUP_GUIDE.md",
    "SUPABASE_CHANNELS_IMPLEMENTATION.md",
    "SUPABASE_SETUP.md",
    "UNUSED_FILES_ANALYSIS.md",
    "email-verification-flow.md",
    "test-signup-guide.md"
)

# PowerShell and other cleanup files
$cleanupFiles = @(
    "cleanup-unused-files.ps1",
    "cleanup-unused-files-fixed.ps1"
)

# Function to safely remove files
function Remove-FilesSafely {
    param(
        [string[]]$FileList,
        [string]$Category
    )
    
    Write-Host ""
    Write-Host "Removing $Category files..." -ForegroundColor Yellow
    
    $removedCount = 0
    $notFoundCount = 0
    
    foreach ($file in $FileList) {
        if (Test-Path $file) {
            try {
                Remove-Item $file -Force
                Write-Host "Removed: $file" -ForegroundColor Green
                $removedCount++
            }
            catch {
                Write-Host "Failed to remove: $file - $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        else {
            Write-Host "File not found: $file" -ForegroundColor Gray
            $notFoundCount++
        }
    }
    
    Write-Host "Summary: $removedCount removed, $notFoundCount not found" -ForegroundColor Cyan
}

# Show what will be removed
Write-Host ""
Write-Host "This will remove the following categories of files:" -ForegroundColor Cyan
Write-Host "- $($sqlFiles.Count) SQL script files" -ForegroundColor White
Write-Host "- $($markdownFiles.Count) markdown documentation files" -ForegroundColor White
Write-Host "- $($cleanupFiles.Count) cleanup script files" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: This will remove ALL SQL migration scripts and documentation!" -ForegroundColor Red
Write-Host "Only README.md will be preserved." -ForegroundColor Yellow

$confirmation = Read-Host "Are you sure you want to proceed? (y/N)"

if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
    # Remove files by category
    Remove-FilesSafely -FileList $sqlFiles -Category "SQL"
    Remove-FilesSafely -FileList $markdownFiles -Category "markdown"
    Remove-FilesSafely -FileList $cleanupFiles -Category "cleanup script"
    
    Write-Host ""
    Write-Host "Enhanced cleanup completed!" -ForegroundColor Green
    Write-Host "All SQL scripts and markdown documentation have been removed." -ForegroundColor Cyan
    Write-Host "Only essential project files remain." -ForegroundColor Cyan
    
    # Show git status after cleanup
    Write-Host ""
    Write-Host "Git status after cleanup:" -ForegroundColor Cyan
    git status --porcelain
}
else {
    Write-Host "Cleanup cancelled." -ForegroundColor Yellow
}
