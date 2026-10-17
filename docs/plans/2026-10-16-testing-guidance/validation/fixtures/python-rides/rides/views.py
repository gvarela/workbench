"""Rides page HTML, built as a string."""
from rides.store import list_rides
from rides.view_model import format_distance


def render_rides_page(rides, today):
    items = "".join(
        f'<li class="ride">{r["date"].isoformat()} - {format_distance(r["km"])}</li>'
        for r in list_rides(rides, today)
    )
    return f"<html><body><h1>Rides</h1><ul>{items}</ul></body></html>"


def render_today_page(rides, today):
    todays = [r for r in rides if r["date"] == today]
    items = "".join(f'<li class="ride">{format_distance(r["km"])}</li>' for r in todays)
    return f"<html><body><h1>Today</h1><ul>{items}</ul></body></html>"
