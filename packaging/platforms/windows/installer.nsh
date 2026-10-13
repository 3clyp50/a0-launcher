!include "LogicLib.nsh"
!include "getProcessInfo.nsh"

Var pid
Var /GLOBAL A0LauncherInstallerLogPath
Var /GLOBAL A0LauncherInstallerLogHandle
!ifndef BUILD_UNINSTALLER
  Var /GLOBAL A0LauncherUserDataBackup
  Var /GLOBAL A0LauncherPreviousUninstallString
!endif

!macro WriteA0LauncherInstallerLog MESSAGE
  StrCpy $A0LauncherInstallerLogPath "$APPDATA\${APP_PACKAGE_NAME}\logs\launcher-installer.log"
  !ifndef BUILD_UNINSTALLER
    ${if} $A0LauncherUserDataBackup != ""
      StrCpy $A0LauncherInstallerLogPath "$A0LauncherUserDataBackup\logs\launcher-installer.log"
      CreateDirectory "$A0LauncherUserDataBackup\logs"
    ${else}
      CreateDirectory "$APPDATA\${APP_PACKAGE_NAME}\logs"
    ${endif}
  !else
    CreateDirectory "$APPDATA\${APP_PACKAGE_NAME}\logs"
  !endif
  ClearErrors
  FileOpen $A0LauncherInstallerLogHandle "$A0LauncherInstallerLogPath" a
  ${ifNot} ${Errors}
    FileWrite $A0LauncherInstallerLogHandle "[a0-launcher-installer] ${MESSAGE}$\r$\n"
    FileClose $A0LauncherInstallerLogHandle
  ${endif}
  ClearErrors
!macroend

!ifndef BUILD_UNINSTALLER
  !define MUI_CUSTOMFUNCTION_GUIEND A0LauncherRestoreUserData
!endif

!macro customHeader
!ifndef BUILD_UNINSTALLER
  Function A0LauncherRestoreUserData
    ${if} $A0LauncherUserDataBackup != ""
      Delete "$APPDATA\${APP_PACKAGE_NAME}\logs\launcher-installer.log"
      RMDir "$APPDATA\${APP_PACKAGE_NAME}\logs"
      RMDir "$APPDATA\${APP_PACKAGE_NAME}"
      ClearErrors
      Rename "$A0LauncherUserDataBackup" "$APPDATA\${APP_PACKAGE_NAME}"
      ${if} ${Errors}
        StrCpy $A0LauncherUserDataBackup ""
        MessageBox MB_OK|MB_ICONSTOP "Launcher settings are preserved at $APPDATA\${APP_PACKAGE_NAME}-installer-backup. Restore that folder before retrying installation." /SD IDOK
        SetErrorLevel 1
        Quit
      ${endif}
      StrCpy $A0LauncherUserDataBackup ""
    ${endif}
  FunctionEnd

  Function A0LauncherPreserveUserData
    ReadRegStr $A0LauncherPreviousUninstallString SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" UninstallString
    ${if} $A0LauncherUserDataBackup == ""
    ${andIf} $A0LauncherPreviousUninstallString != ""
    ${andIf} ${FileExists} "$APPDATA\${APP_PACKAGE_NAME}"
      StrCpy $A0LauncherUserDataBackup "$APPDATA\${APP_PACKAGE_NAME}-installer-backup"
      ClearErrors
      Rename "$APPDATA\${APP_PACKAGE_NAME}" "$A0LauncherUserDataBackup"
      ${if} ${Errors}
        StrCpy $A0LauncherUserDataBackup ""
        MessageBox MB_OK|MB_ICONSTOP "Could not preserve Launcher settings. Installation has stopped before removing the existing app." /SD IDOK
        SetErrorLevel 1
        Quit
      ${endif}
    ${endif}
  FunctionEnd

  Function .onInstFailed
    Call A0LauncherRestoreUserData
  FunctionEnd
!endif
!macroend

!macro customInit
  !ifndef BUILD_UNINSTALLER
    ${if} ${FileExists} "$APPDATA\${APP_PACKAGE_NAME}-installer-backup"
      StrCpy $A0LauncherUserDataBackup "$APPDATA\${APP_PACKAGE_NAME}-installer-backup"
      Call A0LauncherRestoreUserData
    ${endif}
  !endif
  !insertmacro WriteA0LauncherInstallerLog "Installer initialized for $INSTDIR."
!macroend

!macro customUnInit
  !insertmacro WriteA0LauncherInstallerLog "Uninstaller initialized for $INSTDIR."
!macroend

!macro customCheckAppRunning
  !define A0LauncherCheckUniqueId ${__LINE__}
  !insertmacro WriteA0LauncherInstallerLog "Installer checking for running app processes under $INSTDIR."
  !insertmacro IS_POWERSHELL_AVAILABLE
  ${GetProcessInfo} 0 $pid $1 $2 $3 $4

  ${if} $3 != "${APP_EXECUTABLE_FILENAME}"
    !insertmacro FIND_PROCESS "${APP_EXECUTABLE_FILENAME}" $R0
    ${if} $R0 == 0
      ${ifNot} ${isUpdated}
        MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "$(appRunning)" /SD IDOK IDOK a0_launcher_stop_process_${A0LauncherCheckUniqueId}
        Quit
      ${endif}

a0_launcher_stop_process_${A0LauncherCheckUniqueId}:
      DetailPrint "$(appClosing)"
      !insertmacro WriteA0LauncherInstallerLog "Installer found running app processes and is waiting for them to close."
      !insertmacro KILL_PROCESS "${APP_EXECUTABLE_FILENAME}" 0
      Sleep 1000

      StrCpy $R1 0

a0_launcher_wait_loop_${A0LauncherCheckUniqueId}:
      IntOp $R1 $R1 + 1
      !insertmacro FIND_PROCESS "${APP_EXECUTABLE_FILENAME}" $R0
      ${if} $R0 == 0
        ${if} $R1 == 10
          !insertmacro WriteA0LauncherInstallerLog "Installer is force-closing remaining app processes."
          !insertmacro KILL_PROCESS "${APP_EXECUTABLE_FILENAME}" 1
        ${endif}

        DetailPrint `Waiting for "${PRODUCT_NAME}" to close.`
        Sleep 2000

        ${if} $R1 > 30
          !insertmacro WriteA0LauncherInstallerLog "Installer could not close all running app processes."
          MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDRETRY a0_launcher_wait_loop_${A0LauncherCheckUniqueId}
          Quit
        ${else}
          Goto a0_launcher_wait_loop_${A0LauncherCheckUniqueId}
        ${endif}
      ${endif}

      !insertmacro WriteA0LauncherInstallerLog "Installer confirmed that no app processes remain under $INSTDIR."
    ${endif}
  ${endif}
  !undef A0LauncherCheckUniqueId
  !ifndef BUILD_UNINSTALLER
    Call A0LauncherPreserveUserData
  !endif
!macroend

!macro customInstall
  Call A0LauncherRestoreUserData
  !define A0LauncherInstallUniqueId ${__LINE__}
  IfFileExists "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 a0_launcher_install_missing_exe_${A0LauncherInstallUniqueId}
  StrCpy $launchLink "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  !insertmacro WriteA0LauncherInstallerLog "Installer verified $INSTDIR\${APP_EXECUTABLE_FILENAME} after file copy."
  !insertmacro WriteA0LauncherInstallerLog "Installer will launch the installed executable directly instead of relying on a shortcut."
  Goto a0_launcher_install_shortcut_check_${A0LauncherInstallUniqueId}

a0_launcher_install_missing_exe_${A0LauncherInstallUniqueId}:
  !insertmacro WriteA0LauncherInstallerLog "Installer could not verify $INSTDIR\${APP_EXECUTABLE_FILENAME} after file copy."

a0_launcher_install_shortcut_check_${A0LauncherInstallUniqueId}:
  IfFileExists "$newStartMenuLink" a0_launcher_start_menu_ok_${A0LauncherInstallUniqueId} 0
  !insertmacro WriteA0LauncherInstallerLog "Start Menu shortcut was not found after install: $newStartMenuLink."
  Goto a0_launcher_desktop_shortcut_check_${A0LauncherInstallUniqueId}

a0_launcher_start_menu_ok_${A0LauncherInstallUniqueId}:
  !insertmacro WriteA0LauncherInstallerLog "Start Menu shortcut verified: $newStartMenuLink."

a0_launcher_desktop_shortcut_check_${A0LauncherInstallUniqueId}:
  IfFileExists "$newDesktopLink" a0_launcher_desktop_ok_${A0LauncherInstallUniqueId} 0
  !insertmacro WriteA0LauncherInstallerLog "Desktop shortcut was not found after install: $newDesktopLink."
  Goto a0_launcher_install_done_${A0LauncherInstallUniqueId}

a0_launcher_desktop_ok_${A0LauncherInstallUniqueId}:
  !insertmacro WriteA0LauncherInstallerLog "Desktop shortcut verified: $newDesktopLink."

a0_launcher_install_done_${A0LauncherInstallUniqueId}:
  !undef A0LauncherInstallUniqueId
!macroend

!macro customUnInstall
  !insertmacro WriteA0LauncherInstallerLog "Installer is removing the previous app files from $INSTDIR."
!macroend
