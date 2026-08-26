param(
  [Parameter(Mandatory = $true)][long]$MatchId,
  [Parameter(Mandatory = $true)][long]$AccountId,
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$RemainingArgs
)

& node (Join-Path $PSScriptRoot 'analyze-match.mjs') --match-id $MatchId --account-id $AccountId @RemainingArgs
exit $LASTEXITCODE
