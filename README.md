# claude-mods

Personal Claude mods, installed on each PC from this repo.

## Install (run on each PC)

    /plugin install cowork-or-code --marketplace jdhawk93/claude-mods

## cowork-or-code

Recommends whether a task or project belongs in Cowork or Claude Code.

- `/route <task>` scores the wording and returns a verdict, fit bars and the signals behind it.
- Submitting a prompt that clearly fits one tool shows a hint toast. Tune `MIN_SCORE` and `MIN_GAP` in `plugins/cowork-or-code/hooks/register.tsx`.
