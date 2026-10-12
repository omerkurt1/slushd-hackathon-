# Reproducible, locally synthesized Turkish demonstration; not a real driver recording.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$outputDirectory = Join-Path $PSScriptRoot '..\public\audio'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$speaker = [System.Speech.Synthesis.SpeechSynthesizer]::new()
try {
  $speaker.SelectVoice('Microsoft Tolga')
  $speaker.Rate = 0
  $speaker.SetOutputToWaveFile((Join-Path $outputDirectory 'driver-report-demo.wav'))
  $speaker.Speak('Kuzey Marmara çıkışında zincirleme kaza var, yol tıkandı, kırk dakika durduk.')
} finally { $speaker.Dispose() }
