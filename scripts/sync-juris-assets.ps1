param(
    [string]$SourceRoot = (Join-Path $PSScriptRoot '..'),
    [string]$DestinationRoot = (Join-Path $PSScriptRoot '..')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path -Path $DestinationRoot).Path
$sourceRoot = (Resolve-Path -Path $SourceRoot).Path

$copies = @(
    @{
        Source = @('juris-abbrevs/auto-us.json', 'data/auto-us.json')
        Destination = 'juris-abbrevs/auto-us.json'
    },
    @{
        Source = @('juris-abbrevs/primary-us.json', 'data/primary-us.json')
        Destination = 'juris-abbrevs/primary-us.json'
    },
    @{
        Source = @('juris-abbrevs/secondary-us-bluebook.json', 'data/secondary-us-bluebook.json')
        Destination = 'juris-abbrevs/secondary-us-bluebook.json'
    },
    @{
        Source = @('juris-abbrevs/secondary-science.json', 'data/secondary-science.json')
        Destination = 'juris-abbrevs/secondary-science.json'
    },
    @{
        Source = @('juris-maps/juris-us-map.json', 'data/juris-us-map.json')
        Destination = 'juris-maps/juris-us-map.json'
    },
    @{
        Source = @('juris-maps/primary-jurisdictions.json', 'data/primary-jurisdictions.json')
        Destination = 'juris-maps/primary-jurisdictions.json'
    },
    @{
        Source = @('juris-maps/case-jurisdiction-map.json', 'data/case-jurisdiction-map.json')
        Destination = 'juris-maps/case-jurisdiction-map.json'
    }
)

foreach ($copy in $copies) {
    $sourcePath = $null
    foreach ($candidate in $copy.Source) {
        $candidatePath = Join-Path -Path $sourceRoot -ChildPath $candidate
        if (Test-Path -LiteralPath $candidatePath) {
            $sourcePath = $candidatePath
            break
        }
    }

    if (-not $sourcePath) {
        Write-Warning "Skipping missing asset: $($copy.Destination)"
        continue
    }

    $destinationPath = Join-Path -Path $repoRoot -ChildPath $copy.Destination
    $destinationDir = Split-Path -Path $destinationPath -Parent
    if (-not (Test-Path -LiteralPath $destinationDir)) {
        New-Item -ItemType Directory -Path $destinationDir | Out-Null
    }

    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
    Write-Host "Synced $($copy.Destination)" -ForegroundColor Cyan
}

Write-Host "Jurisdiction asset sync complete." -ForegroundColor Green
