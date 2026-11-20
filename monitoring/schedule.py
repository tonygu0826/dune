"""DST-aware gate for two UTC schedules; independent of runner queue delay."""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo


def should_run(event, cron, now=None):
    if event != "schedule":
        return True
    local = (now or datetime.now(timezone.utc)).astimezone(ZoneInfo("America/Toronto"))
    utc_hour = 9 - int(local.utcoffset().total_seconds() / 3600)
    return cron == f"0 {utc_hour} * * *"


if __name__ == "__main__":
    import os
    run = should_run(os.environ.get("EVENT_NAME"), os.environ.get("EVENT_SCHEDULE"))
    with open(os.environ["GITHUB_OUTPUT"], "a") as stream:
        stream.write(f"run={'true' if run else 'false'}\n")
