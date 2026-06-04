# Actualizare zilnica — automatizare (Windows Task Scheduler)

Ruleaza skill-ul `actualizare-zilnica` in fiecare zi la **21:00**: valideaza
`mi-dia.html`, sincronizeaza docs/memorie cu fapte confirmate, apoi commit + push.

## Fisiere
- `actualizare-zilnica.cmd` — wrapper-ul care lanseaza Claude headless cu `/actualizare-zilnica` si scrie log in `.claude/logs/`.
- `actualizare-zilnica.task.xml` — definitia task-ului Windows (declansator zilnic 21:00).
- Skill-ul propriu-zis: `.claude/skills/actualizare-zilnica/SKILL.md`.

## ATENTIE: cai specifice masinii
`actualizare-zilnica.cmd` si `.task.xml` contin cai absolute pentru acest calculator:
- proiect: `C:\Users\Ines\Desktop\Mi-Dia-App`
- claude: `C:\Users\Ines\AppData\Roaming\npm\claude.cmd`

Pe alt calculator, ajusteaza-le inainte de instalare.

## Instalare pe un calculator nou
1. Verifica/ajusteaza caile din `actualizare-zilnica.cmd`.
2. Verifica calea wrapper-ului din `actualizare-zilnica.task.xml` (`<Arguments>`).
3. Inregistreaza task-ul (PowerShell, in folderul proiectului):
   ```powershell
   $xml = Get-Content ".claude\scripts\actualizare-zilnica.task.xml" -Raw
   Register-ScheduledTask -TaskName "Mi Dia - Actualizare zilnica" -Xml $xml -Force
   ```

## Comenzi utile
- Test imediat: `Start-ScheduledTask -TaskName "Mi Dia - Actualizare zilnica"`
- Stare: `Get-ScheduledTaskInfo -TaskName "Mi Dia - Actualizare zilnica"`
- Dezactiveaza / sterge: `Disable-ScheduledTask` / `Unregister-ScheduledTask`

## Conditii
Calculatorul trebuie pornit si utilizatorul logat la 21:00 (LogonType: Interactive).
Daca era oprit, ruleaza imediat ce pornesti (StartWhenAvailable).
