[CmdletBinding(PositionalBinding = $false)]
param(
  # A match ID or a Dotabuff/OpenDota/STRATZ match link.
  [Parameter(Mandatory = $true)][string]$MatchId,
  # A friend ID, Steam64 ID or profile link.
  [string]$AccountId,
  [string]$Hero,
  # 0-4 Radiant, 5-9 Dire.
  [ValidateRange(0, 9)][int]$Slot,
  [ValidateRange(1, [int]::MaxValue)][int]$ParseTimeoutMs = 120000,
  [string]$OutputDir,
  [string]$HistoryDir,
  [string]$At
)

$runtimeArgs = @('--match-id', $MatchId)
if ($PSBoundParameters.ContainsKey('AccountId')) {
  $runtimeArgs += @('--account-id', $AccountId)
}
if ($PSBoundParameters.ContainsKey('Slot')) {
  $runtimeArgs += @('--slot', [string]$Slot)
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
if ($PSBoundParameters.ContainsKey('At')) {
  $runtimeArgs += @('--at', $At)
}

& node (Join-Path $PSScriptRoot 'analyze-match.mjs') @runtimeArgs
exit $LASTEXITCODE
