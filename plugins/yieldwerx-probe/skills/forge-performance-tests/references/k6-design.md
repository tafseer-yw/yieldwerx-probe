# k6 performance design checks

| Profile   | Answers                                                   | Typical scheduling   |
| --------- | --------------------------------------------------------- | -------------------- |
| Smoke     | Does one representative iteration and every check work?   | PR or pre-run        |
| Load      | Does the service meet SLOs at expected traffic?           | scheduled/release    |
| Spike     | Does it tolerate and recover from a sudden surge?         | scheduled/supervised |
| Stress    | Where does degradation begin and is failure graceful?     | supervised           |
| Endurance | Does sustained load reveal leaks or accumulating latency? | supervised window    |

For every workload, record:

- approved target, role, operation mix, concurrency/arrival model, ramp, duration,
  dataset size, and maximum request rate;
- the source of each p95/p99, error-rate, throughput, and recovery objective;
- setup/cleanup ownership, unique run correlation, and interruption recovery;
- server/load-generator telemetry and abort conditions;
- whether asynchronous jobs complete inside or outside the request latency SLO.

Use k6 checks to validate business responses and thresholds to control the exit
status. Tag critical operations so aggregate latency cannot hide a slow endpoint.
Prefer arrival-rate executors when the requirement is requests/transactions per
time and VU executors when the requirement is concurrent actors. Keep think time
representative; do not add arbitrary sleep merely to make charts look smoother.

Do not compare runs across materially different data, topology, k6 version,
network path, target build, or load-generator capacity without recording the
difference. A performance result is evidence for that exact run context.
