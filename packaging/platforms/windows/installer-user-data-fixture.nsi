Unicode true
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!define APP_EXECUTABLE_FILENAME "a0-installer-fixture-app.exe"
!define UNINSTALL_FILENAME "legacy-uninstaller.exe"
!define PRODUCT_NAME "Launcher installer fixture"
!include "installer.nsh"
!insertmacro customHeader

Name "Launcher installer fixture"
OutFile "${TEST_ROOT}\fixture-${TEST_CASE}.exe"
InstallDir "${TEST_ROOT}\installed"
RequestExecutionLevel user
SilentInstall silent
SilentUnInstall silent
Var launchLink
Var newStartMenuLink
Var newDesktopLink

Function .onInit
  !insertmacro customInit
FunctionEnd

Section
  IfFileExists "$APPDATA\${APP_PACKAGE_NAME}\settings.json" +3 0
    SetErrorLevel 1
    Quit
  CreateDirectory "$INSTDIR"
  WriteUninstaller "$INSTDIR\${UNINSTALL_FILENAME}"
  WriteRegStr HKCU "${UNINSTALL_REGISTRY_KEY}" UninstallString "$INSTDIR\${UNINSTALL_FILENAME}"
  Call A0LauncherPreserveUserData
  ExecWait '"$INSTDIR\${UNINSTALL_FILENAME}" /S _?=$INSTDIR' $0
  !if "${TEST_CASE}" == "failure"
    Abort "Simulated extraction failure"
  !endif
  !if "${TEST_CASE}" == "conflict"
    CreateDirectory "$APPDATA\${APP_PACKAGE_NAME}"
    FileOpen $0 "$APPDATA\${APP_PACKAGE_NAME}\new-user-data.txt" w
    FileWrite $0 "New state must survive"
    FileClose $0
  !endif
  !insertmacro customInstall
SectionEnd

Section "uninstall"
  !insertmacro customUnInit
  RMDir /r "$APPDATA\${APP_PACKAGE_NAME}"
  DeleteRegKey HKCU "${UNINSTALL_REGISTRY_KEY}"
SectionEnd
