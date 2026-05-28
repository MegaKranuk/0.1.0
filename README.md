🛡️ Cybersecurity Incident Tracker
Вебзастосунок для реєстрації та аналізу кіберзагроз (шкідливе ПЗ, фішинг, DDoS тощо).

🏗 Як це працює (Архітектура)
Проєкт розділений на дві незалежні частини:

🖥 Frontend (Vite + TypeScript): Працює без фреймворків (Vanilla TS). Код чітко поділений на логічні шари: робота з мережею (apiClient.ts), рендер інтерфейсу (ui.ts), управління станом (main.ts) та кешування (cache.ts).

⚙️ Backend (Node.js/Express + TS): REST API з базою даних SQLite (база створюється сама при запуску). Побудований за класичним патерном: Routes ➔ Controllers ➔ Services ➔ Repositories.

🚀 Швидкий старт
Вам знадобиться Node.js (бажано v18+).

1. Піднімаємо бекенд
Сервер запуститься на порту 3000. Всі міграції бази даних виконаються автоматично.

Bash
cd backend
npm install
npm run start:dev
📚 Swagger-документація буде доступна тут: http://localhost:3000/api-docs

2. Піднімаємо фронтенд
Клієнтська частина запуститься на порту 5173.

Bash
cd frontend
npm install
npm run dev
🌐 Відкрийте посилання з термінала у браузері (зазвичай це http://localhost:5173).

🛠 Тестуємо API (cURL)
Кілька готових запитів, щоб швидко перевірити, як бекенд обробляє дані.

1. Отримати список інцидентів (з пагінацією):

Bash
curl -X GET "http://localhost:3000/api/v1/incidents?page=1&pageSize=5" -H "accept: application/json"
2. Створити новий запис (успішний сценарій):

Bash
curl -X POST "http://localhost:3000/api/v1/incidents" \
-H "Content-Type: application/json" \
-d '{"date": "2026-04-25", "tag": "DDoS-атака", "criticality": "Дуже критично", "reporter": "Адміністратор", "comment": "Виявлено аномальний трафік на порт 443"}'
3. Перевірити валідацію (помилка 400 Bad Request):
Спеціально передаємо криві дані (коротке ім'я та опис), щоб побачити, як сервер віддає об'єкт з деталями помилок.

Bash
curl -X POST "http://localhost:3000/api/v1/incidents" \
-H "Content-Type: application/json" \
-d '{"tag": "Фішинг", "criticality": "Низька критичність", "reporter": "A", "comment": "Мало тексту"}'
4. Перевірка CORS (для браузера):
Перевіряємо, чи дозволяє бекенд робити запити з порту фронтенда.

Bash
curl -X OPTIONS "http://localhost:3000/api/v1/incidents" \
-H "Origin: http://localhost:5173" \
-H "Access-Control-Request-Method: POST" -i
🤝 Правила роботи з даними (DTO)
Щоб API залишалося стабільним (v1) і нічого не ламалося, у нас є суворі правила:

Основні поля (id, date, tag, criticality) не можна перейменовувати або видаляти.

Якщо треба додати щось нове (наприклад, reporterId), ми робимо це поле необов'язковим (optional).
