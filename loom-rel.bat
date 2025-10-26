@echo off
REM --- LOOM ---

echo Thank you for using loom!
echo Star https://github.com/cert1e/loom/

if "%1"=="" (
    echo E - No file specified!
    exit
) else (
    if "%2"=="" (
        echo E - No operation specified!
        exit
    ) else (
        node .\loom.js %1 %2
    )
)