[CmdletBinding(PositionalBinding = $false)]
param(
  [Parameter(Mandatory = $true)][long]$MatchId,
  [long]$AccountId,
  [string]$Hero,
  [ValidateRange(1, [int]::MaxValue)][int]$ParseTimeoutMs = 120000,
  [string]$OutputDir,
  [string]$HistoryDir
)

$runtimeArgs = @('--match-id', [string]$MatchId)
if ($PSBoundParameters.ContainsKey('AccountId')) {
  $runtimeArgs += @('--account-id', [string]$AccountId)
}
if ($PSBoundParameters.ContainsKey('Hero')) {
  $runtimeArgs += @('--hero', $Hero)
}
$runtimeArgs += @('--parse-timeout-ms', [string]$ParseTimeoutMs)
if ($PSBoundParameters.ContainsKey('OutputDir')) {
  $runtimeArgs += @('--output-dir', $OutputDir)
}
if ($PSBoundParameters.ContainsKey('HistoryDir')) {
  $runtimeArgs += @('--history-dir', $HistoryDir)
}

& node (Join-Path $PSScriptRoot 'analyze-match.mjs') @runtimeArgs
exit $LASTEXITCODE
