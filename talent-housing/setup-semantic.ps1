$ErrorActionPreference = 'Stop'
$revision = 'e8f8c211226b894fcb81acc59f3b34ba3efd5f42'
$modelRoot = Join-Path $PSScriptRoot 'models/minilm-multilingual'
New-Item -ItemType Directory -Force -Path $modelRoot | Out-Null
$proxy = [System.Net.WebRequest]::GetSystemWebProxy().GetProxy([uri]'https://huggingface.co')
foreach ($file in @('tokenizer.json','config.json','onnx/model_quint8_avx2.onnx')) {
    $target = Join-Path $modelRoot ([IO.Path]::GetFileName($file))
    if (Test-Path -LiteralPath $target) {
        if ($file.EndsWith('.onnx') -and (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne '98a01d88b7de996cdea58c32ca71208c09968d143798814b2ea09d3439dc334f') { throw 'Model integrity mismatch' }
        continue
    }
    $partial = $target + '.partial'
    & curl.exe --silent --show-error --fail --location --proxy $proxy.AbsoluteUri --connect-timeout 20 --max-time 300 --output $partial "https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2/resolve/$revision/$file"
    if ($LASTEXITCODE -ne 0) { throw "Model download failed: $file" }
    Move-Item -LiteralPath $partial -Destination $target
    if ($file.EndsWith('.onnx') -and (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne '98a01d88b7de996cdea58c32ca71208c09968d143798814b2ea09d3439dc334f') { throw 'Model integrity mismatch' }
}
Get-ChildItem -LiteralPath $modelRoot -File | Get-FileHash -Algorithm SHA256 | Select-Object Hash,Path
