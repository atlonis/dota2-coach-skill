param(
  [Parameter(Mandatory = $true)][long]$MatchId,
  [long]$AccountId,
  [string]$Hero,
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$RemainingArgs
)

$runtimeArgs = @('--match-id', [string]$MatchId)
if ($PSBoundParameters.ContainsKey('AccountId')) {
  $runtimeArgs += @('--account-id', [string]$AccountId)
}
if ($PSBoundParameters.ContainsKey('Hero')) {
  $runtimeArgs += @('--hero', $Hero)
}

& node (Join-Path $PSScriptRoot 'analyze-match.mjs') @runtimeArgs @RemainingArgs
exit $LASTEXITCODE
