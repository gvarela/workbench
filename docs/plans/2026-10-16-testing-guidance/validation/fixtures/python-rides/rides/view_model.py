"""Turns raw ride values into display values."""


def format_distance(km):
    """Distance as a display string, rounded to one decimal, e.g. 12.3 km."""
    return f"{round(km, 1)} km"
