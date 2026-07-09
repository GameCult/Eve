param(
  [string[]] $HandoffPaths = @(
    "plugins\incubating\sai-vn.plugin-handoff.json",
    "plugins\incubating\norn-graph.plugin-handoff.json",
    "plugins\incubating\tex-math.plugin-handoff.json"
  )
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot

foreach ($handoffPath in $HandoffPaths) {
  $absoluteHandoffPath = if ([System.IO.Path]::IsPathRooted($handoffPath)) {
    $handoffPath
  } else {
    Join-Path $projectRoot $handoffPath
  }

  if (-not (Test-Path -LiteralPath $absoluteHandoffPath)) {
    throw "Plugin handoff manifest not found: $absoluteHandoffPath"
  }

  $handoff = Get-Content -LiteralPath $absoluteHandoffPath -Raw | ConvertFrom-Json

  if ($handoff.schema -ne "gamecult.eve.plugin_handoff.v1") {
    throw "Unexpected plugin handoff schema in $($handoffPath): $($handoff.schema)"
  }
  if (-not $handoff.pluginId) {
    throw "Plugin handoff missing pluginId: $handoffPath"
  }
  if (-not $handoff.ownerRepo) {
    throw "Plugin handoff missing ownerRepo: $($handoff.pluginId)"
  }
  if ($handoff.currentHostRepo -ne "Eve") {
    throw "Plugin handoff $($handoff.pluginId) has unexpected current host: $($handoff.currentHostRepo)"
  }

  foreach ($pathProperty in @("manifestPath", "advertisementPath", "abiFixturePath")) {
    $relativePath = $handoff.$pathProperty
    if (-not $relativePath) {
      throw "Plugin handoff $($handoff.pluginId) missing $pathProperty"
    }
    $absolutePath = Join-Path $projectRoot $relativePath
    if (-not (Test-Path -LiteralPath $absolutePath)) {
      throw "Plugin handoff $($handoff.pluginId) references missing $($pathProperty): $relativePath"
    }
  }

  $manifest = Get-Content -LiteralPath (Join-Path $projectRoot $handoff.manifestPath) -Raw | ConvertFrom-Json
  $advertisement = Get-Content -LiteralPath (Join-Path $projectRoot $handoff.advertisementPath) -Raw | ConvertFrom-Json
  $abiFixture = Get-Content -LiteralPath (Join-Path $projectRoot $handoff.abiFixturePath) -Raw | ConvertFrom-Json

  if ($manifest.pluginId -ne $handoff.pluginId) {
    throw "Plugin handoff pluginId does not match manifest: $($handoff.pluginId) vs $($manifest.pluginId)"
  }
  if ($advertisement.pluginId -ne $handoff.pluginId) {
    throw "Plugin handoff pluginId does not match advertisement: $($handoff.pluginId) vs $($advertisement.pluginId)"
  }
  if ($abiFixture.pluginId -ne $handoff.pluginId) {
    throw "Plugin handoff pluginId does not match ABI fixture: $($handoff.pluginId) vs $($abiFixture.pluginId)"
  }
  if ($manifest.incubation.ownerRepo -ne $handoff.ownerRepo) {
    throw "Plugin handoff $($handoff.pluginId) owner does not match manifest owner: $($manifest.incubation.ownerRepo)"
  }
  if ($manifest.incubation.splitTarget -ne $handoff.splitTarget) {
    throw "Plugin handoff $($handoff.pluginId) split target does not match manifest: $($manifest.incubation.splitTarget)"
  }
  if ($manifest.runtime.invocationModel -ne "executable-sidecar") {
    throw "Plugin handoff $($handoff.pluginId) runtime is not executable-sidecar: $($manifest.runtime.invocationModel)"
  }
  if ($manifest.runtime.contract -ne "gamecult.eve.plugin_abi.v1") {
    throw "Plugin handoff $($handoff.pluginId) runtime contract is not gamecult.eve.plugin_abi.v1: $($manifest.runtime.contract)"
  }
  if ($advertisement.runtime.invocationModel -ne $manifest.runtime.invocationModel) {
    throw "Plugin handoff $($handoff.pluginId) advertisement runtime does not match manifest runtime: $($advertisement.runtime.invocationModel)"
  }
  foreach ($transport in @("cultmesh", "stdio")) {
    if (-not (@($manifest.runtime.transports) -contains $transport)) {
      throw "Plugin handoff $($handoff.pluginId) manifest runtime missing transport: $transport"
    }
    if (-not (@($advertisement.runtime.transports) -contains $transport)) {
      throw "Plugin handoff $($handoff.pluginId) advertisement runtime missing transport: $transport"
    }
  }
  foreach ($authority in @("renderer-independent", "no-provider-state-mutation", "provider-accepts-or-denies-commands")) {
    if (-not (@($manifest.runtime.authority) -contains $authority)) {
      throw "Plugin handoff $($handoff.pluginId) manifest runtime missing authority: $authority"
    }
    if (-not (@($advertisement.runtime.authority) -contains $authority)) {
      throw "Plugin handoff $($handoff.pluginId) advertisement runtime missing authority: $authority"
    }
  }
  foreach ($sidecarProperty in @("processKind", "protocol", "requestSchema", "responseSchema", "commandEnvelope", "receiptSchema", "stateAuthority")) {
    if (-not $manifest.runtime.sidecar.$sidecarProperty) {
      throw "Plugin handoff $($handoff.pluginId) manifest sidecar missing property: $sidecarProperty"
    }
    if ($advertisement.runtime.sidecar.$sidecarProperty -ne $manifest.runtime.sidecar.$sidecarProperty) {
      throw "Plugin handoff $($handoff.pluginId) advertisement sidecar $sidecarProperty does not match manifest: $($advertisement.runtime.sidecar.$sidecarProperty)"
    }
  }

  $operations = @($abiFixture.operations | ForEach-Object { $_.operation })
  foreach ($operation in @("describe", "validate", "project", "lower", "measure", "apply")) {
    if (-not ($operations -contains $operation)) {
      throw "Plugin handoff $($handoff.pluginId) ABI fixture missing operation: $operation"
    }
    if (-not (@($manifest.runtime.sidecar.operations) -contains $operation)) {
      throw "Plugin handoff $($handoff.pluginId) manifest sidecar missing operation: $operation"
    }
    if (-not (@($advertisement.runtime.sidecar.operations) -contains $operation)) {
      throw "Plugin handoff $($handoff.pluginId) advertisement sidecar missing operation: $operation"
    }
  }

  foreach ($moveSet in @($handoff.moveSets)) {
    if ($moveSet.destinationOwner -ne $handoff.ownerRepo) {
      throw "Plugin handoff $($handoff.pluginId) move set $($moveSet.id) has unexpected destination owner: $($moveSet.destinationOwner)"
    }
    if (-not $moveSet.replacementProof) {
      throw "Plugin handoff $($handoff.pluginId) move set $($moveSet.id) missing replacement proof"
    }
    foreach ($relativePath in @($moveSet.currentPaths)) {
      $absolutePath = Join-Path $projectRoot $relativePath
      if (-not (Test-Path -LiteralPath $absolutePath)) {
        throw "Plugin handoff $($handoff.pluginId) move set $($moveSet.id) references missing path: $relativePath"
      }
    }
  }

  foreach ($contract in @(
    "gamecult.eve.plugin.v1",
    "gamecult.eve.plugin_advertisement.v1",
    "gamecult.eve.plugin_abi.v1",
    "gamecult.eve.plugin_abi_fixture.v1",
    "gamecult.eve.conformance_export.v1"
  )) {
    if (-not (@($handoff.contractInputs) -contains $contract)) {
      throw "Plugin handoff $($handoff.pluginId) missing contract input: $contract"
    }
  }

  foreach ($proof in @($handoff.requiredExternalProofs)) {
    if (-not $proof) {
      throw "Plugin handoff $($handoff.pluginId) contains an empty required external proof"
    }
  }
}

Write-Host "Plugin handoff smoke passed: $($HandoffPaths -join ', ')"
