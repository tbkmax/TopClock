@echo off
setlocal

for %%I in ("%~dp0..") do set "CLOCK_ROOT=%%~fI"

set "SDK_CORE=%CLOCK_ROOT%\.tools\sdk-core\c"
set "SDK_X64=%CLOCK_ROOT%\.tools\sdk-x64\c"
if exist "%SDK_CORE%\bin\10.0.26100.0\x64" if exist "%SDK_X64%\um\x64" (
    set "PATH=%SDK_CORE%\bin\10.0.26100.0\x64;%PATH%"
    set "LIB=%SDK_X64%\um\x64;%SDK_X64%\ucrt\x64;%LIB%"
    set "INCLUDE=%SDK_CORE%\Include\10.0.26100.0\um;%SDK_CORE%\Include\10.0.26100.0\shared;%SDK_CORE%\Include\10.0.26100.0\ucrt;%SDK_CORE%\Include\10.0.26100.0\winrt;%INCLUDE%"
)

if exist "%CLOCK_ROOT%\.tools\cargo\bin\cargo.exe" (
    set "RUSTUP_HOME=%CLOCK_ROOT%\.tools\rustup"
    set "CARGO_HOME=%CLOCK_ROOT%\.tools\cargo"
    set "PATH=%CLOCK_ROOT%\.tools\cargo\bin;%PATH%"
)

set "VCVARS=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if exist "%VCVARS%" call "%VCVARS%" >nul

call "%~dp0..\node_modules\.bin\tauri.cmd" %*
exit /b %ERRORLEVEL%
