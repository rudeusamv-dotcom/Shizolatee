# model-saver

Мод для Claude: смотрит на твой запрос и подсказывает, какой модели хватит для задачи
(Haiku, Sonnet или Opus), чтобы не тратить лимит на сильную модель там, где справится и простая.

Подсказка появляется над полем ввода. Команда `/economy` включает и выключает подсказки.

## Установка

В терминальной сессии Claude Code:

```
/plugin install model-saver --marketplace Shizolatee/model-saver
```

Из обычного терминала:

```
claude plugin install model-saver --marketplace Shizolatee/model-saver
```

Ответь `y` на вопрос о добавлении маркетплейса и выбери область установки (user — для всех сессий).

В десктопном приложении, где `/plugin` не работает: нажми + рядом с полем ввода → Plugins →
Add marketplace с `Shizolatee/model-saver` → Add plugin.
