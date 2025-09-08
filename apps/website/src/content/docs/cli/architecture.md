---
title: architecture
draft: true
---

```d2
direction: down

"mission-brief.md"

quicksmith
blueprint
user
terminal
hacksmith
hacksmith.contextifact

# "mission-brief.md" -> claude
# "mission-brief.md" -> gemini
# "mission-brief.md" -> cursor-agent

"mission-brief.md" -> llm-broker: "triggers AI agent"

# this should also be possible
# user -> terminal: "npx hacksmith --directive='add dark mode'"
quicksmith -- blueprint: "authors blueprints"
user -> terminal: "npx hacksmith"
# claude <- terminal <- user
# gemini <- terminal <- user
# cursor-agent <- terminal <- user
terminal -> hacksmith
hacksmith.contextifact -> "mission-brief.md"
blueprint -> hacksmith.contextifact: "execute CLI flows"
```

See [usage](/cli/usage) for more details.
