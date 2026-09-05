@echo off
cd /d "%~dp0"
set "JAVA_EXE=C:\Users\emb20\AppData\Roaming\PrismLauncher\java\java-runtime-delta\bin\java.exe"
if not exist "%JAVA_EXE%" (
  echo Java 21 was not found. Edit JAVA_EXE in start-server.bat.
  pause
  exit /b 1
)
"%JAVA_EXE%" @user_jvm_args.txt @libraries/net/neoforged/neoforge/21.1.244/win_args.txt nogui %*
pause
