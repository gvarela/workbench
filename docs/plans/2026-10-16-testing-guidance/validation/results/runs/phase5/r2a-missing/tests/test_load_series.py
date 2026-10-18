from datetime import date

from rides.store import load_series

TODAY = date(2026, 10, 28)


def test_load_series_counts_this_week():
    rides = [
        {"date": date(2026, 10, 28), "km": 10.0},
        {"date": date(2026, 10, 26), "km": 8.0},
        {"date": date(2026, 10, 23), "km": 12.0},
    ]
    value = load_series(rides, TODAY)[0]
    assert value == 3
