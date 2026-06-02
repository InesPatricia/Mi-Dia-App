# Mi Día

**🌐 Languages / Idiomas / Limbi:** [English](#english) · [Español](#español) · [Română](#română)

---

## English

A Mediterranean planner and journal: plan your day in time slots, guided
journaling, projects, calendar, statistics and calm tools — with a focus on
coaching reflection and energy awareness.

### Running the app
The app is a single file. Open `mi-dia.html` directly in your browser
(double-click, or drag it into Chrome). All data is saved locally in the browser.

### Backup
The **Day → Backup** tab exports/imports everything as a `.json` file.
Recommended: export periodically. Git keeps versions of the *code*, not your data.

### Data model (short)
- **Area** (`area`): the life-area of an activity. One per slot. Editable, max 8.
- **Tag** (`tag`): cross-cutting context. Several per slot.
- **Slot/activity** (`block`): { id, title, cat (area id), time, dur, tags[], done }

### History
See the commits for how the project evolved over versions.

---

## Español

Un planificador y diario mediterráneo: planifica tu día en franjas horarias,
diario guiado, proyectos, calendario, estadísticas y herramientas de calma —
con foco en la reflexión de coaching y la conciencia de la energía.

### Cómo ejecutar la app
La app es un único archivo. Abre `mi-dia.html` directamente en el navegador
(doble clic, o arrástralo a Chrome). Todos los datos se guardan localmente en el navegador.

### Copia de seguridad
La pestaña **Día → Backup** exporta/importa todo en un archivo `.json`.
Recomendación: exporta periódicamente. Git guarda versiones del *código*, no tus datos.

### Modelo de datos (resumen)
- **Área** (`area`): el área de vida de una actividad. Una por franja. Editable, máx. 8.
- **Etiqueta** (`tag`): contexto transversal. Varias por franja.
- **Franja/actividad** (`block`): { id, title, cat (id de área), time, dur, tags[], done }

### Historial
Consulta los commits para ver cómo evolucionó el proyecto por versiones.

---

## Română

Un planner și jurnal mediteranean: planificarea zilei pe sloturi orare, jurnal
ghidat, proiecte, calendar, statistici și unelte de calm — cu focus pe reflecția
de coaching și conștientizarea energiei.

### Cum rulez aplicația
Aplicația e un singur fișier. Deschide `mi-dia.html` direct în browser
(dublu-click, sau trage-l în Chrome). Toate datele se salvează local în browser.

### Backup
Tab-ul **Zi → Backup** exportă/importă tot într-un fișier `.json`.
Recomandare: exportă periodic. Git păstrează versiunile *codului*, nu datele tale.

### Model de date (pe scurt)
- **Arie** (`area`): zona de viață a unei activități. Una per slot. Editabilă, max 8.
- **Etichetă** (`tag`): context transversal. Mai multe per slot.
- **Slot/activitate** (`block`): { id, title, cat (id de arie), time, dur, tags[], done }

### Istoric
Vezi commit-urile pentru evoluția pe versiuni.
