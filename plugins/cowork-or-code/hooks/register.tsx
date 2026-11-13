import type { Register } from 'claude-code'

type Signal = { re: RegExp; w: number; why: string }

// Weighted keyword signals. Edit these lists to tune the advice.
const CODE: Signal[] = [
  { re: /\b(repo|repository|git|branch|commit|pull request|pr)\b/i, w: 3, why: 'works in a git repo' },
  { re: /\b(bug|debug|stack ?trace|exception|failing test|unit test|tests?)\b/i, w: 3, why: 'debugging / tests' },
  { re: /\b(refactor|function|class|module|api|endpoint|sdk|library|compile|build|lint|typescript|python|javascript|react|sql|bash|script|cli)\b/i, w: 2, why: 'writes or edits source code' },
  { re: /\b(deploy|ci|pipeline|docker|kubernetes|terraform|server|database|migration)\b/i, w: 2, why: 'dev / infra tooling' },
  { re: /\b(codebase|source code|npm|pip|package\.json|dependency|dependencies)\b/i, w: 3, why: 'codebase-level change' },
  { re: /\b(app|website|web ?site|plugin|mod|extension|bot|automation)\b/i, w: 1, why: 'building software' },
]
const COWORK: Signal[] = [
  { re: /\b(doc|document|report|memo|proposal|letter|contract|policy|sop)\b/i, w: 3, why: 'produces documents' },
  { re: /\b(spreadsheet|excel|xlsx|csv|budget|invoice|expense|forecast)\b/i, w: 3, why: 'spreadsheets / finance files' },
  { re: /\b(slides?|deck|presentation|powerpoint|pptx)\b/i, w: 3, why: 'presentations' },
  { re: /\b(email|inbox|calendar|meeting|schedule|agenda|reply|draft)\b/i, w: 3, why: 'email / calendar admin' },
  { re: /\b(research|summari[sz]e|compare|analy[sz]e|review|brief|notes)\b/i, w: 2, why: 'research / synthesis' },
  { re: /\b(organi[sz]e|rename|sort|clean up|folder|files?|desktop|downloads|pdf)\b/i, w: 2, why: 'local file organising' },
  { re: /\b(browser|website form|sign in|log ?in|portal|click|fill out)\b/i, w: 2, why: 'drives apps / browser on your PC' },
  { re: /\b(plan|tracker|task list|todo|weekly|recurring|routine)\b/i, w: 1, why: 'planning / recurring admin' },
]

const score = (text: string, signals: Signal[]) => {
  let total = 0
  const reasons: string[] = []
  for (const s of signals) {
    if (s.re.test(text)) {
      total += s.w
      reasons.push(s.why)
    }
  }
  return { total, reasons }
}

const advise = (task: string): string => {
  const text = task.trim()
  if (!text) {
    return 'Usage: /route <describe the task or project>\nExample: /route reconcile Q3 invoices in a spreadsheet and email a summary'
  }
  const code = score(text, CODE)
  const cowork = score(text, COWORK)
  const sum = code.total + cowork.total
  const codePct = sum === 0 ? 50 : Math.round((code.total / sum) * 100)
  const coworkPct = 100 - codePct

  let verdict: string
  let next: string
  if (sum === 0) {
    verdict = 'UNCLEAR'
    next = 'No strong signals. Rule of thumb: touches a code repo or needs tests/git → Code; produces documents, sheets, email or works across your PC apps → Cowork.'
  } else if (Math.abs(codePct - coworkPct) < 25) {
    verdict = 'SPLIT (Cowork + Code)'
    next = codePct > coworkPct
      ? 'Build the code part in Code; use Cowork for the documents, notes and admin around it.'
      : 'Run the main workflow in Cowork; hand any scripts or automation to Code.'
  } else if (codePct > coworkPct) {
    verdict = 'CLAUDE CODE'
    next = 'Open the project folder in Claude Code (desktop app → Code tab).'
  } else {
    verdict = 'COWORK'
    next = 'Start a Cowork task and give it access to the relevant folder (desktop app → Cowork tab).'
  }

  const bar = (pct: number) => '█'.repeat(Math.round(pct / 5)).padEnd(20, '░')
  return [
    `Recommendation: ${verdict}`,
    '',
    '| Option | Fit | Score |',
    '|---|---|---|',
    `| Code   | ${bar(codePct)} ${codePct}% | ${code.total} |`,
    `| Cowork | ${bar(coworkPct)} ${coworkPct}% | ${cowork.total} |`,
    '',
    '| Signals for Code | Signals for Cowork |',
    '|---|---|',
    `| ${code.reasons.join('; ') || '-'} | ${cowork.reasons.join('; ') || '-'} |`,
    '',
    `Next: ${next}`,
    '',
    'Reminder: Cowork works on the PC it runs on, so a task started on one PC needs its files synced (OneDrive/Drive/git) before you continue on the other.',
  ].join('\n')
}

// Hint only when the signal is strong; otherwise stay quiet.
const MIN_SCORE = 5
const MIN_GAP = 40 // percentage points between the two fits

const hint = (prompt: string): string | undefined => {
  const code = score(prompt, CODE)
  const cowork = score(prompt, COWORK)
  const sum = code.total + cowork.total
  if (sum < MIN_SCORE) return undefined
  const codePct = Math.round((code.total / sum) * 100)
  if (Math.abs(codePct - (100 - codePct)) < MIN_GAP) return undefined
  return codePct > 50
    ? `Hint: this looks like a Claude Code task (${code.reasons.join(', ')}). /route for details`
    : `Hint: this looks like a Cowork task (${cowork.reasons.join(', ')}). /route for details`
}

export const register: Register = on => {
  on('prompt.submit', ($, e, next) => {
    // Plain typed prompts only: skip slash commands and very short input.
    const text = e.text ?? ''
    if (!e.command && !text.startsWith('/') && text.length > 20) {
      const h = hint(text)
      if (h) $.ui.toast(h)
    }
    return next(e)
  })

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'route',
      description: 'Recommend Cowork or Claude Code for a task: /route <task>',
    })
    return next(e)
  })

  on('command.run', { command: 'route' }, async (_$, e) => ({ text: advise(e.args) }))
}
