# Remove old lobby page files
$files = @(
    "app\lobby\[matchId]\page-v5.tsx",
    "app\lobby\[matchId]\page-phase11.tsx",
    "app\lobby\[matchId]\page-phase12.tsx",
    "app\lobby\[matchId]\page-new.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Removed: $file"
    }
}

Write-Host "Cleanup complete!"
