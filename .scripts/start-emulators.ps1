$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
$env:PATH = $env:JAVA_HOME + '\\bin;' + $env:PATH
java -version
corepack pnpm run dev:emulator
