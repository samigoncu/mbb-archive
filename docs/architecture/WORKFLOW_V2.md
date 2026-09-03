# Workflow v2

The v1.1 runtime is a deliberately limited BPMN-aligned execution model.

Supported nodes:

- Start Event
- User Task
- Service Task
- Timer Catch Event
- Exclusive Gateway
- End Event

Conditions are not arbitrary scripts. The safe grammar is:

```text
status == approved
status != rejected
exists(decision)
```

User Tasks persist permissions and SLA due dates. Timer events persist `WakeAt`.
Service Tasks publish an integration event and wait for an explicit completion
callback. Background monitors resume due timers and escalate overdue tasks.
