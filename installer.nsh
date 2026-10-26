; Custom NSIS script for "Дом с Алисой PC"
; Добавляет приветственное сообщение и настраивает инсталлятор

!macro customHeader
  ; Устанавливаем красивый заголовок мастера установки
  !define MUI_WELCOMEPAGE_TITLE "Добро пожаловать в установщик$\r$\nДом с Алисой PC"
  !define MUI_WELCOMEPAGE_TEXT "Этот мастер поможет вам установить приложение «Дом с Алисой PC» для управления умным домом Яндекса.$\r$\n$\r$\nПосле установки вам потребуется только запустить приложение и ввести OAuth-токен Яндекса.$\r$\n$\r$\nНажмите «Далее» для продолжения."
  !define MUI_FINISHPAGE_TITLE "Установка завершена!"
  !define MUI_FINISHPAGE_TEXT "Приложение «Дом с Алисой PC» успешно установлено.$\r$\n$\r$\nПри первом запуске откройте Настройки и введите ваш OAuth-токен Яндекса для подключения к умному дому."
  !define MUI_FINISHPAGE_RUN "$INSTDIR\Дом с Алисой PC.exe"
  !define MUI_FINISHPAGE_RUN_TEXT "Запустить «Дом с Алисой PC» сейчас"
!macroend

!macro customInstall
  ; Запись информации о версии в реестр
  WriteRegStr HKCU "Software\SmHomePC" "Version" "1.0.0"
  WriteRegStr HKCU "Software\SmHomePC" "Author" "smokelnk"
!macroend

!macro customUnInstall
  ; Очистка записей из реестра при удалении
  DeleteRegKey HKCU "Software\SmHomePC"
!macroend
