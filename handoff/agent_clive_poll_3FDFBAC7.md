INSTRUCTION [3FDFBAC7-CA05-49CB-8D1E-6952E7062683]
Role target: AGENT_CLIVE
Objective: Poll Codex and acknowledge repository context switch.

Message to Codex:
- "I am operating on a different repository now."
- Request ACK from Codex and wait for scoped task UUID.

Reply format:
RESULT [3FDFBAC7-CA05-49CB-8D1E-6952E7062683]
Role: AGENT_CLIVE
Status: PASS|FAIL|BLOCKED
AckFromCodex: yes|no
CurrentRepo: <absolute path>
Next: <single next action>
