import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Tip } from '../types'

const tip = atom({ plugin: 'model-saver', key: 'tip' } as const, null)
const isOff = atom({ plugin: 'model-saver', key: 'isOff' } as const, false)

// Уровни моделей: чем выше, тем дороже и быстрее тратит лимит.
const TIERS: readonly string[] = ["Haiku", "Sonnet", "Opus", "Fable"]
const tierName = (i: number): string => TIERS[i] ?? "Opus"

function tierOf(model: string): number {
  const m = model.toLowerCase()
  if (m.includes('haiku')) return 0
  if (m.includes('sonnet')) return 1
  if (m.includes('fable') || m.includes('mythos')) return 3
  return 2 // opus и всё неизвестное
}

function prettyModel(model: string): string {
  return tierName(tierOf(model))
}

type Need = { tier: number; reason: string }

const has = (t: string, words: string[]) => words.some(w => t.includes(w))

// Простая эвристика без вызова модели — сама подсказка ничего не тратит.
function classify(raw: string): Need {
  const t = raw.toLowerCase()
  const len = raw.length
  const hasCode = raw.includes('```') || /\b(def |function |class |import |const |SELECT )/.test(raw)

  const hard = [
    'архитектур', 'спроектируй', 'с нуля', 'весь проект', 'бизнес-план', 'бизнес план',
    'стратеги', 'исследуй', 'исследование', 'глубок', 'сложн', 'оптимизируй',
    'рефактор', 'найди причину', 'почему не работает', 'отладь', 'проанализируй',
    'architecture', 'design a system', 'refactor', 'research', 'debug', 'from scratch',
  ]
  const mid = [
    'бот', 'скрипт', 'код', 'функци', 'ошибк', 'баг', 'сайт', 'парсер', 'api',
    'напиши пост', 'статью', 'текст для', 'письмо', 'документ', 'таблиц', 'сравни',
    'план', 'объясни', 'мод', 'расширени', 'telegram', 'python', 'javascript',
    'script', 'code', 'bug', 'write', 'compare', 'explain',
  ]
  const easy = [
    'переведи', 'перевод', 'translate', 'исправь ошибки', 'опечат', 'орфограф',
    'перефразируй', 'переформулируй', 'сократи', 'короче', 'кратко', 'суммируй',
    'что такое', 'что значит', 'сколько', 'как называется', 'кто такой', 'синоним',
    'придумай название', 'придумай ник', 'хештег', 'эмодзи', 'привет', 'спасибо',
    'конвертируй', 'посчитай', 'формула', 'regex', 'регулярк', 'rephrase', 'summarize',
    'what is', 'how many', 'fix typos',
  ]

  if (len > 2500 || has(t, hard)) {
    return { tier: 2, reason: 'сложная задача — тут сильная модель оправдана' }
  }
  if (has(t, easy) && len < 600 && !hasCode) {
    return { tier: 0, reason: 'короткая простая задача (перевод, правка текста, быстрый вопрос)' }
  }
  if (has(t, mid) || hasCode || len > 400) {
    return { tier: 1, reason: 'обычная задача с кодом или текстом' }
  }
  if (len < 150) {
    return { tier: 0, reason: 'короткий вопрос' }
  }
  return { tier: 1, reason: 'задача средней сложности' }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'economy',
      description: 'Включить или выключить подсказки, какой модели хватит для запроса',
    })
    return next(e)
  })

  on('command.run', { command: 'economy' }, async $ => {
    const off = !(await read($, isOff))
    await update($, isOff, () => off)
    if (off) await update($, tip, () => null)
    return { text: off ? 'Подсказки об экономии выключены.' : 'Подсказки об экономии включены.' }
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.command || e.isMeta) return next(e)

    try {
      if (!(await read($, isOff))) {
        const current = await $.session.model()
        const need = classify(e.text)

        if (need.tier < tierOf(current)) {
          const t: Tip = { suggested: tierName(need.tier), current: prettyModel(current), reason: need.reason }
          await update($, tip, () => t)
        } else {
          await update($, tip, () => null)
        }
      }
    } catch {
      // подсказка не должна мешать отправке запроса
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const t = await read($, tip)
    if (e.props.hasSurvey || t === null || (await read($, isOff))) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text>
          💡 Для такого запроса хватит {t.suggested} ({t.reason}). Сейчас: {t.current}. Переключи модель, чтобы
          сэкономить лимит.{' '}
        </Text>
        <Button key="hide" label="Понятно" onPress={() => update($, tip, () => null)} />
        <Button key="off" label="Выключить" onPress={() => update($, isOff, () => true)} />
      </Box>
    )
  })
}
