from datetime import date

from rides.totals import day_total

TODAY = date(2026, 10, 28)


def test_day_total_sums_only_todays_distances():
    rides = [
        {"date": TODAY, "km": 10.0},
        {"date": TODAY, "km": 2.5},
        {"date": date(2026, 10, 27), "km": 7.0},
    ]
    assert day_total(rides, TODAY) == 12.5
