# Mi Día

Planner + jurnal mediteranean: planificarea zilei pe sloturi, jurnal ghidat,
proiecte, calendar, statistici și unelte de calm — cu focus pe reflecție de
coaching și conștientizarea energiei.

## Cum rulez aplicația
Aplicația e un singur fișier. Deschide `mi-dia.html` direct în browser
(dublu-click sau drag în Chrome). Toate datele se salvează local în browser.

## Backup
Tab-ul **Zi → Backup** exportă/importă tot într-un fișier `.json`.
Recomandare: exportă periodic; Git păstrează versiunile codului, nu datele tale.

## Model de date (pe scurt)
- **Arie** (`area`): zona de viață a unei activități. Una per slot. Editabilă, max 8.
- **Etichetă** (`tag`): context transversal. Mai multe per slot.
- **Slot/activitate** (`block`): { id, title, cat (id de arie), time, dur, tags[], done }

## Istoric
Vezi commit-urile pentru evoluția pe versiuni.
