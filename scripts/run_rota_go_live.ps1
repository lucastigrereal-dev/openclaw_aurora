param(
  [ValidateSet('init','run','resume','status','approve','reset')]
  [string]$Action = 'status',
  [string]$StepId = ''
)

$ErrorActionPreference = 'Stop'
$Root = 'C:\Users\lucas\Downloads\openclaw_aurora-cerberus-go-live'
$Evidence = 'C:\Users\lucas\Downloads\rota-leads-go-live-v2'
$State = Join-Path $Root 'data\cerberus\rota-go-live-state.json'
$Plan = Join-Path $Root 'config\cerberus-go-live.rota.json'

$env:ROTA_PORTAL_REPO = 'C:\Users\lucas\Downloads\rota-das-aguas-portal-go-live'
$env:ROTA_PORTAL_PUBLIC_URL = 'https://rota-das-aguas.vercel.app'
$env:ROTA_PORTAL_DEPLOY_COMMAND = 'curl.exe -fSs https://rota-das-aguas.vercel.app/api/health'
$env:TIGRE_CRM_REPO = 'C:\Users\lucas\Downloads\tigre-digital-dash-go-live'
$env:TIGRE_CRM_PUBLIC_URL = 'https://tigre-digital-dash.pages.dev'
$env:ROTA_LEADS_PREP_COMMAND = "python `"$Root\scripts\prepare_rota_leads.py`" --output `"$Evidence`""
$env:ROTA_LEADS_AUDIT_COMMAND = "python `"$Root\scripts\audit_rota_leads.py`" --dir `"$Evidence`""
$env:TIGRE_CRM_IMPORT_COMMAND = "python `"$Root\scripts\verify_external_evidence.py`" --path `"$Evidence\crm_import_evidence.json`" --min-imported 15"
$env:ROTA_GO_LIVE_E2E_COMMAND = "python `"$Root\scripts\verify_rota_go_live.py`" --evidence-dir `"$Evidence`""
$env:CERBERUS_CONCURRENCY = '3'
$env:CERBERUS_DRY_RUN = 'false'

Set-Location $Root
switch ($Action) {
  'init' { npm run cerberus -- init $State $Plan }
  'approve' {
    if (-not $StepId) { throw 'StepId obrigatório para approve' }
    npm run cerberus -- approve $State $StepId
  }
  default { npm run cerberus -- $Action $State }
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
